//const extId = 'ekincidnpifabcbbchcapcahaoeoccgp'; //1.0
//const extId = 'bnmjmbmlfohkaghofdaadenippkgpmab'; //1.01
const extId = 'ekincidnpifabcbbchcapcahaoeoccgp' //1.02 

let bookmarkManagerData = {
    collections: [],
    openInNewTab: false,
    chromeWindowStates: {},
    darkMode: false,
    leftPaneOpen: true,
    rightPaneOpen: true,
    githubConfig: {
        username: '',
        repo: '',
        pat: '',
        filepath: 'bookmarks.json'
    }
};

let draggedItem = null;
let placeholder = null;

document.getElementById('toggleLeftPane').addEventListener('click', function () {
    togglePane('leftPane');
});

document.getElementById('toggleRightPane').addEventListener('click', function () {
    togglePane('rightPane');
});

// Funktion för att validera GitHub-konfigurationen
function isGitHubConfigValid() {
    const { username, repo, pat } = bookmarkManagerData.githubConfig;
    return username && repo && pat;
}

// Funktion för att hämta data från GitHub via background.js
async function fetchFromGitHub() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'fetchFromGitHub',
            config: bookmarkManagerData.githubConfig
        });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        return response.content;
    } catch (error) {
        console.error('Error in fetchFromGitHub:', error);
        throw error;
    }
}

// Funktion för att pusha till GitHub via background.js
async function pushToGitHub(content) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'pushToGitHub',
            config: bookmarkManagerData.githubConfig,
            content: content
        });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        return response.success;
    } catch (error) {
        console.error('Error in pushToGitHub:', error);
        throw error;
    }
}

// Variabel för att spåra om synkronisering pågår
let isSyncing = false; 

// Huvudfunktion för synkronisering
async function synchronizeWithGitHub(retryCount = 0) {
    if (!isGitHubConfigValid()) {
        alert('Please configure GitHub settings first');
        return;
    }

    if (isSyncing) {
        console.log('Sync already in progress, skipping...');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton.classList.add('syncing');
    isSyncing = true;
    
    try {
        console.log('Starting synchronization...');
        const remoteData = await fetchFromGitHub();
        
        const safeData = {
            darkMode: bookmarkManagerData.darkMode,
            openInNewTab: bookmarkManagerData.openInNewTab,
            chromeWindowStates: bookmarkManagerData.chromeWindowStates,
            collections: bookmarkManagerData.collections,
            githubConfig: {
                username: bookmarkManagerData.githubConfig.username,
                repo: bookmarkManagerData.githubConfig.repo,
                filepath: bookmarkManagerData.githubConfig.filepath
            }
        };
        
        if (remoteData === null) {
            console.log('No existing remote data - creating initial file...');
            await pushToGitHub(safeData);
            console.log('Initial sync completed');
            return;
        }

        let needsUpdate = false;
        const updatedCollections = new Map();

        // Steg 1: Skapa lookup-maps för snabbare åtkomst
        const localCollectionsMap = new Map(
            bookmarkManagerData.collections.map(c => [c.id, c])
        );
        const remoteCollectionsMap = new Map(
            remoteData.collections.map(c => [c.id, c])
        );

        console.log('Processing remote collections...');
        
        // Steg 2: Bearbeta remote collections
        for (const [remoteId, remoteCollection] of remoteCollectionsMap) {
            const localCollection = localCollectionsMap.get(remoteId);
            
            if (!localCollection) {
                console.log(`- New collection found remotely: ${remoteId}`);
                updatedCollections.set(remoteId, remoteCollection);
                needsUpdate = true;
                continue;
            }

            // Jämför timestamps för collections
            const useRemote = remoteCollection.lastModified > localCollection.lastModified;
            const useLocal = remoteCollection.lastModified < localCollection.lastModified;

            // Hantera deleted status för collections
            if (remoteCollection.deleted || localCollection.deleted) {
                if (remoteCollection.deleted && localCollection.deleted) {
                    updatedCollections.set(remoteId, useRemote ? remoteCollection : localCollection);
                } else if (remoteCollection.deleted && useRemote) {
                    updatedCollections.set(remoteId, remoteCollection);
                } else if (localCollection.deleted && useLocal) {
                    updatedCollections.set(remoteId, localCollection);
                } else {
                    updatedCollections.set(remoteId, useRemote ? remoteCollection : localCollection);
                }
                needsUpdate = true;
                continue;
            }

            // Om collection inte är borttagen, processa dess bookmarks
            const mergedBookmarks = new Map();
            
            const localBookmarksMap = new Map(
                localCollection.bookmarks.map(b => [b.id, b])
            );
            const remoteBookmarksMap = new Map(
                remoteCollection.bookmarks.map(b => [b.id, b])
            );

            const allBookmarkIds = new Set([
                ...localBookmarksMap.keys(),
                ...remoteBookmarksMap.keys()
            ]);

            for (const bookmarkId of allBookmarkIds) {
                const localBookmark = localBookmarksMap.get(bookmarkId);
                const remoteBookmark = remoteBookmarksMap.get(bookmarkId);

                if (!localBookmark && remoteBookmark) {
                    mergedBookmarks.set(bookmarkId, remoteBookmark);
                    needsUpdate = true;
                } else if (localBookmark && !remoteBookmark) {
                    mergedBookmarks.set(bookmarkId, localBookmark);
                    needsUpdate = true;
                } else if (localBookmark && remoteBookmark) {
                    if (localBookmark.deleted && !remoteBookmark.deleted) {
                        mergedBookmarks.set(bookmarkId, localBookmark); // Behåll den lokala raderingen
                        needsUpdate = true;
                    } else if (!localBookmark.deleted && remoteBookmark.deleted) {
                        mergedBookmarks.set(bookmarkId, remoteBookmark); // Ta bort lokalt baserat på fjärr
                        needsUpdate = true;
                    } else if (localBookmark.lastModified >= remoteBookmark.lastModified) {
                        mergedBookmarks.set(bookmarkId, localBookmark);
                    } else {
                        mergedBookmarks.set(bookmarkId, remoteBookmark);
                        needsUpdate = true;
                    }
                }
            }
            
            updatedCollections.set(remoteId, {
                ...localCollection,
                lastModified: Math.max(localCollection.lastModified, remoteCollection.lastModified),
                position: useRemote ? remoteCollection.position : localCollection.position,
                bookmarks: Array.from(mergedBookmarks.values())
                    .sort((a, b) => a.position - b.position)
            });
        }

        // Steg 3: Hantera lokala collections som inte finns remote
        for (const [localId, localCollection] of localCollectionsMap) {
            if (!remoteCollectionsMap.has(localId)) {
                updatedCollections.set(localId, localCollection);
                needsUpdate = true;
            }
        }

        // Steg 4: Uppdatera lokalt state och synka till remote
        if (needsUpdate) {
            const sortedCollections = Array.from(updatedCollections.values())
                .sort((a, b) => a.position - b.position);
            
            bookmarkManagerData.collections = sortedCollections;
        
            const githubData = {
                darkMode: bookmarkManagerData.darkMode,
                openInNewTab: bookmarkManagerData.openInNewTab,
                chromeWindowStates: bookmarkManagerData.chromeWindowStates,
                collections: sortedCollections,
                githubConfig: {
                    username: bookmarkManagerData.githubConfig.username,
                    repo: bookmarkManagerData.githubConfig.repo,
                    filepath: bookmarkManagerData.githubConfig.filepath,
                    pat: ''
                }
            };

            try {
                await pushToGitHub(githubData);
                console.log('Successfully pushed changes to remote');
            } catch (pushError) {
                if (pushError.message.includes("Update conflict") && retryCount < 3) {
                    console.log(`Conflict detected, retrying (attempt ${retryCount + 1})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    isSyncing = false;
                    return synchronizeWithGitHub(retryCount + 1);
                }
                throw pushError;
            }

            renderCollections();
            saveToLocalStorage();
        } else {
            console.log('No changes needed');
        }

    } catch (error) {
        console.error('Sync failed:', error);
        alert(`Synchronization failed: ${error.message}`);
    } finally {
        isSyncing = false;
        syncButton.classList.remove('syncing');
    }
}

// Hjälpfunktion för att generera unika ID:n
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function importBookmarks() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
  
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.version === 3 && Array.isArray(importedData.lists)) {
                    const newCollections = importedData.lists.map(list => {
                        const newCollection = enrichCollection({
                            name: list.title,
                            isOpen: true,
                            bookmarks: []
                        });

                        if (Array.isArray(list.cards)) {
                            newCollection.bookmarks = list.cards.map(async card => {
                                return enrichBookmark({
                                    title: card.customTitle || card.title,
                                    url: card.url,
                                    description: card.customDescription || '',
                                    icon: await getFavicon(card.url)
                                });
                            });
                        }

                        return newCollection;
                    });

                    bookmarkManagerData.collections = [
                        ...bookmarkManagerData.collections,
                        ...newCollections
                    ];

                    renderCollections();
                    saveToLocalStorage();
                    alert('Bookmarks imported successfully!');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                console.error('Error importing bookmarks:', error);
                alert('Error importing bookmarks. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }
}

// Uppdaterad funktion för att spara till localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));
        console.log('Saved data to localStorage');
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Uppdaterad funktion för att ladda från localStorage
function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('bookmarkManagerData');
        if (data) {
            const parsedData = JSON.parse(data);
            
            // Enrich collections and bookmarks
            if (Array.isArray(parsedData.collections)) {
                parsedData.collections = parsedData.collections.map(enrichCollection);
            }

            const existingPat = bookmarkManagerData.githubConfig?.pat;

            // Hantera den nya datastrukturen
            bookmarkManagerData = {
                ...bookmarkManagerData,  // Behåll standardvärden
                ...parsedData,  // Överskrid med sparade värden
                githubConfig: {
                    ...bookmarkManagerData.githubConfig, // Behåll standard githubConfig
                    ...(parsedData.githubConfig || {}),  // Överskrid med sparade githubConfig värden
                    pat: existingPat || parsedData.githubConfig?.pat || '' // Behåll existerande PAT
                }
            };

            // Säkerställ att leftPaneOpen och rightPaneOpen har värden
            bookmarkManagerData.leftPaneOpen = parsedData.leftPaneOpen !== undefined ? parsedData.leftPaneOpen : true;
            bookmarkManagerData.rightPaneOpen = parsedData.rightPaneOpen !== undefined ? parsedData.rightPaneOpen : true;
        }
        
        document.getElementById('openInNewTab').checked = bookmarkManagerData.openInNewTab;
        document.getElementById('darkMode').checked = bookmarkManagerData.darkMode;
        
        if (bookmarkManagerData.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
            
        applyPaneStates();
        console.log('Loaded data from localStorage');

    } catch (error) {
        console.error('Error loading from local storage:', error);
        // Vid fel, använd standardvärden
        bookmarkManagerData = {
            collections: [],
            openInNewTab: false,
            chromeWindowStates: {},
            darkMode: false,
            leftPaneOpen: true,
            rightPaneOpen: true,
            githubConfig: {
                username: '',
                repo: '',
                pat: '',
                filepath: 'bookmarks.json'
            }
        };
    }
}

// Uppdaterad renderCollections funktion
function renderCollections() {
    const collectionsContainer = document.getElementById('collections');
    collectionsContainer.innerHTML = '';

    const sortedCollections = [...bookmarkManagerData.collections]
        .sort((a, b) => a.position - b.position);

    sortedCollections.forEach((collection) => { //bookmarkManagerData
        if (collection.deleted) return;

        const collectionElement = document.createElement('div');
        collectionElement.className = `collection ${collection.isOpen ? 'is-open' : ''}`;
        collectionElement.setAttribute('draggable', 'true');
        collectionElement.dataset.collectionId = collection.id;

        const collectionHeader = document.createElement('div');
        collectionHeader.className = 'collection-header';

        const titleArea = document.createElement('div');
        titleArea.className = 'collection-title-area';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '☰';
        dragHandle.setAttribute('draggable', 'true');

        // Lägg till drag event-lyssnare på dragHandle
        dragHandle.addEventListener('dragstart', dragStartCollection);
        dragHandle.addEventListener('dragend', dragEnd);

        const collectionTitle = document.createElement('h2');
        collectionTitle.textContent = collection.name;

        const toggleButton = document.createElement('button');
        toggleButton.className = 'toggle-collection';
        toggleButton.textContent = collection.isOpen ? '∨' : '∧';

        titleArea.appendChild(dragHandle);
        titleArea.appendChild(collectionTitle);
        titleArea.appendChild(toggleButton);

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'collection-actions';

        // Skapa knappar för samlingens åtgärder här...
        const launchButton = createButton('launch-collection', '🚀', 'Launch collection as a Chrome-group');
        const addBookmarkButton = createButton('add-bookmark', 'Add Bookmark', 'Manually add a new bookmark');
        const editCollectionButton = createButton('edit-collection', 'Edit', 'Rename collection');
        const moveUpButton = createButton('move-collection', '▲', 'Move collection up');
        const moveDownButton = createButton('move-collection', '▼', 'Move collection down');
        const deleteCollectionButton = createButton('delete-collection', 'Delete', 'Remove collection');

        launchButton.addEventListener('click', () => launchCollection(collection.id));
        toggleButton.addEventListener('click', () => toggleCollection(collection.id));
        addBookmarkButton.addEventListener('click', () => addBookmark(collection.id));
        editCollectionButton.addEventListener('click', () => editCollection(collection.id));
        moveUpButton.addEventListener('click', () => moveCollection(collection.id, -1));
        moveDownButton.addEventListener('click', () => moveCollection(collection.id, 1));
        deleteCollectionButton.addEventListener('click', () => deleteCollection(collection.id));

        actionsContainer.appendChild(launchButton);
        actionsContainer.appendChild(addBookmarkButton);
        actionsContainer.appendChild(editCollectionButton);
        actionsContainer.appendChild(moveUpButton);
        actionsContainer.appendChild(moveDownButton);
        actionsContainer.appendChild(deleteCollectionButton);

        collectionHeader.appendChild(titleArea);
        collectionHeader.appendChild(actionsContainer);
        collectionElement.appendChild(collectionHeader);

        const bookmarksContainer = document.createElement('div');
        bookmarksContainer.className = 'bookmarks';
        bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';

        if (collection.bookmarks.length > 0) {
            // Sortera bookmarks efter position innan rendering
            const sortedBookmarks = [...collection.bookmarks]
                .sort((a, b) => a.position - b.position);

            sortedBookmarks.forEach((bookmark) => {  // Ta bort .bookmarks här
                if (bookmark.deleted) return;
                const bookmarkElement = createBookmarkElement(bookmark, collection.id);
                bookmarksContainer.appendChild(bookmarkElement);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-collection-message';
            emptyMessage.textContent = 'Drag bookmarks here';
            emptyMessage.dataset.collectionId = collection.id; // Lägg till detta
            //bookmarksContainer.appendChild(emptyMessage);
            addEmptyMessageListeners(emptyMessage);
        }

        collectionElement.appendChild(bookmarksContainer);
        addCollectionDragListeners(collectionElement);
        collectionsContainer.appendChild(collectionElement);
    });

    saveToLocalStorage();
}


        function createButton(className, text, tooltipText) {
            const button = document.createElement('button');
            button.className = `collection-button ${className}`;
            button.textContent = text;
            if (tooltipText) {
                button.title = tooltipText;
            }
            return button;
        }

// Uppdaterad createBookmarkElement funktion
function createBookmarkElement(bookmark, collectionId) {
    const bookmarkElement = document.createElement('div');
    bookmarkElement.className = 'bookmark';
    bookmarkElement.setAttribute('draggable', 'true');
    bookmarkElement.dataset.collectionId = collectionId;
    bookmarkElement.dataset.bookmarkId = bookmark.id;

    const bookmarkIcon = document.createElement('img');
    bookmarkIcon.src = bookmark.icon || 'default-icon.png';
    bookmarkIcon.alt = 'Icon';

    const bookmarkTitle = document.createElement('h3');
    bookmarkTitle.textContent = bookmark.title;
    bookmarkTitle.title = bookmark.title;

    const bookmarkDescription = document.createElement('p');
    bookmarkDescription.textContent = bookmark.description || '';
    bookmarkDescription.title = bookmark.description || '';

    const editIcon = document.createElement('span');
    editIcon.className = 'edit-icon';
    editIcon.textContent = '✏️';

    const deleteIcon = document.createElement('span');
    deleteIcon.className = 'delete-icon';
    deleteIcon.textContent = '🗑️';

    bookmarkElement.appendChild(bookmarkIcon);
    bookmarkElement.appendChild(bookmarkTitle);
    bookmarkElement.appendChild(bookmarkDescription);
    bookmarkElement.appendChild(editIcon);
    bookmarkElement.appendChild(deleteIcon);

    bookmarkElement.addEventListener('dragstart', dragStartBookmark);
    bookmarkElement.addEventListener('dragend', dragEnd);
    bookmarkElement.addEventListener('dragover', dragOverBookmark);
    bookmarkElement.addEventListener('drop', dropBookmark);

    editIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        editBookmark(collectionId, bookmark.id);
    });

    deleteIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBookmark(collectionId, bookmark.id);
    });
    
    bookmarkElement.addEventListener('click', () => openBookmark(collectionId, bookmark.id));

    return bookmarkElement;
}

        
        function findFavicon(url, callback) {
            // Se till att URL:en inte har en avslutande snedstreck
            const baseUrl = url.replace(/\/$/, '');
        
            // Definiera potentiella favicon-sökvägar
            const potentialFavicons = [
                `${baseUrl}/favicon.ico`,
                `${baseUrl}/favicon.png`,
                `${baseUrl}/favicon.gif`,
                `${baseUrl}/favicon.jpg`,
                `${baseUrl}/favicon.svg`,
                `${baseUrl}/apple-touch-icon.png`, // För Apple-enheter
                `${baseUrl}/android-chrome-192x192.png`, // För Android-enheter
                `${baseUrl}/mstile-150x150.png`, // För Windows Tiles
            ];
        
            let found = false;
        
            // Funktion för att testa nästa favicon-URL
            function testNext() {
                if (potentialFavicons.length === 0) {
                    callback(null); // Ingen favicon hittades
                    return;
                }
        
                const faviconUrl = potentialFavicons.shift();
                const img = new Image();
        
                img.onload = function() {
                    if (!found) {
                        found = true;
                        callback(faviconUrl); // Favicon hittad
                    }
                };
        
                img.onerror = function() {
                    if (!found) {
                        testNext(); // Testa nästa URL
                    }
                };
        
                img.src = faviconUrl;
            }
        
            // Starta testprocessen
            testNext();
        }
        
        function getFavicon(url) {
            const extensionId = extId; // Ersätt med ditt extension-ID
            return new Promise((resolve, reject) => {
                //chrome.runtime.sendMessage(extensionId, { action: 'fetchFavicon', url }, (response) => {
                chrome.runtime.sendMessage({ action: 'fetchFavicon', url }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Hantera eventuella fel från sendMessage
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (response && response.faviconUrl) {
                        resolve(response.faviconUrl);
                    } else {
                        reject(new Error('Ingen favicon URL mottogs från extensionen.'));
                    }
                });
            });
        }

        function getFavicon_old2(cardUrl) {
            try {
                findFavicon(cardUrl, function(faviconUrl) {
                    if (faviconUrl) {
                        return faviconUrl;
                    } else {
                        console.log('Ingen favicon hittades i submapp vi försöker igen.');
                        const url = new URL(cardUrl);
        
                        // Construct base URL for the website
                        const baseUrl = url.protocol + "//" + url.hostname;
                        findFavicon(baseUrl, function(faviconUrl) {
                            if (faviconUrl) {
                                return faviconUrl;
                            } else {
                                console.log('Ingen favicon hittades för den angivna URL:en.');
                                console.log(`https://www.google.com/s2/favicons?domain=${cardUrl}&sz=32`)
                                return `https://www.google.com/s2/favicons?domain=${cardUrl}&sz=32`;
                            }
                        });
                    }
                });

                // Parse the given URL
                const url = new URL(cardUrl);
        
                // Construct base URL for the website
                const baseUrl = url.protocol + "//" + url.hostname;
                console.log("Base URL:", baseUrl);
                // Return the assumed favicon location
                return baseUrl + "/favicon.ico";
            } catch (error) {
                console.error("Invalid URL provided:", cardUrl);
                return `https://www.google.com/s2/favicons?domain=${cardUrl}&sz=32`;
            }
        }
    
        async function getFaviconOld(url) {
            try {
                const domain = new URL(url).hostname;
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                const response = await fetch(faviconUrl);
                if (response.ok) {
                    return faviconUrl;
                }
            } catch (error) {
                console.error('Error fetching favicon:', error);
            }
            return 'default-icon.png';
        }
// Helper function to enrich a single bookmark
function enrichBookmark(bookmark) {
    if (!bookmark.id) {
        bookmark.id = generateUUID();
    }
    if (bookmark.deleted === undefined) {
        bookmark.deleted = false;
    }
    if (!bookmark.lastModified) {
        bookmark.lastModified = Date.now();
    }
    return bookmark;
}

// Helper function to enrich a single collection
function enrichCollection(collection) {
    if (!collection.id) {
        collection.id = generateUUID();
    }
    if (collection.deleted === undefined) {
        collection.deleted = false;
    }
    if (!collection.lastModified) {
        collection.lastModified = Date.now();
    }
    collection.bookmarks = collection.bookmarks.map(enrichBookmark);
    return collection;
}

// Uppdaterad funktion för att lägga till en ny samling        
function addCollection() {
    const name = prompt('Enter collection name:');
    if (name) {
        const newCollection = {
            id: generateUUID(),
            name: name,
            isOpen: true,
            lastModified: Date.now(),
            deleted: false,
            position: bookmarkManagerData.collections.length,
            bookmarks: []
        };
        bookmarkManagerData.collections.push(newCollection);
        renderCollections();
    }
}

// Uppdaterad funktion för att redigera en samling
function editCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const newName = prompt('Enter new collection name:', collection.name);
        if (newName) {
            collection.name = newName;
            collection.lastModified = Date.now();
            renderCollections();
        }
    }
}

// Uppdaterad toggleCollection funktion
function toggleCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        collection.isOpen = !collection.isOpen;
        collection.lastModified = Date.now();
        
        // Hitta collection-elementet och uppdatera dess klasser
        const collectionElement = document.querySelector(`.collection[data-collection-id="${collectionId}"]`);
        if (collectionElement) {
            collectionElement.classList.toggle('is-open', collection.isOpen);
            
            // Uppdatera bookmarks container display
            const bookmarksContainer = collectionElement.querySelector('.bookmarks');
            if (bookmarksContainer) {
                bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';
            }
        }
        
        saveToLocalStorage();
    }
}

// Uppdaterad funktion för att ta bort en samling
function deleteCollection(collectionId) {
    if (confirm('Are you sure you want to delete this collection?')) {
        const collectionIndex = bookmarkManagerData.collections.findIndex(c => c.id === collectionId);
        if (collectionIndex !== -1) {
            bookmarkManagerData.collections[collectionIndex].deleted = true;
            bookmarkManagerData.collections[collectionIndex].lastModified = Date.now();
            renderCollections();
        }
    }
}

// Uppdaterad funktion för att lägga till ett bokmärke
async function addBookmark(collectionId) {
    const title = prompt('Enter bookmark title:');
    const url = prompt('Enter bookmark URL:');
    const description = prompt('Enter bookmark description:');
    if (title && url) {
        const icon = await getFavicon(url);
        const newBookmark = {
            id: generateUUID(),
            title: title,
            url: url,
            description: description,
            icon: icon,
            lastModified: Date.now(),
            deleted: false,
            position: collection.bookmarks.length
        };
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
        if (collection) {
            collection.bookmarks.push(newBookmark);
            collection.lastModified = Date.now();
            renderCollections();
        }
    }
}

// Uppdaterad funktion för att redigera ett bokmärke
async function editBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
            const title = prompt('Edit bookmark title:', bookmark.title);
            const url = prompt('Edit bookmark URL:', bookmark.url);
            const description = prompt('Edit bookmark description:', bookmark.description);
            if (title && url) {
                const icon = await getFavicon(url);
                Object.assign(bookmark, { title, url, description, icon, lastModified: Date.now() });
                collection.lastModified = Date.now();
                renderCollections();
            }
        }
    }
}

// Uppdaterad funktion för att ta bort ett bokmärke
function deleteBookmark(collectionId, bookmarkId) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
        if (collection) {
            const bookmarkIndex = collection.bookmarks.findIndex(b => b.id === bookmarkId);
            if (bookmarkIndex !== -1) {
                collection.bookmarks[bookmarkIndex].deleted = true;
                collection.bookmarks[bookmarkIndex].lastModified = Date.now();
                collection.lastModified = Date.now();
                renderCollections();
            }
        }
    }
}

// Uppdaterad openBookmark funktion
function openBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
            if (bookmarkManagerData.openInNewTab) {
                window.open(bookmark.url, '_blank');
            } else {
                window.location.href = bookmark.url;
            }
        }
    }
}

function launchCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const urls = collection.bookmarks.filter(b => !b.deleted).map(bookmark => bookmark.url);
        const extensionId = extId; // Ersätt med ditt extension-ID
    
        chrome.runtime.sendMessage(extensionId, {
            action: 'launchCollection',
            urls: urls,
            collectionName: collection.name
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error launching collection:', chrome.runtime.lastError);
                alert('Error launching collection. Make sure the extension is installed and active.');
            } else if (response && response.success) {
                console.log('Collection launched successfully');
            } else {
                console.error('Failed to launch collection');
                alert('Failed to launch collection. Please try again.');
            }
        });
    }
}

function moveCollection(collectionId, direction) {
    const currentIndex = bookmarkManagerData.collections.findIndex(c => c.id === collectionId);
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < bookmarkManagerData.collections.length) {
        const [movedCollection] = bookmarkManagerData.collections.splice(currentIndex, 1);
        bookmarkManagerData.collections.splice(newIndex, 0, movedCollection);
        
        // Uppdatera positioner och timestamps för alla påverkade collections
        bookmarkManagerData.collections.forEach((collection, index) => {
            collection.position = index;
            collection.lastModified = Date.now();
        });
        
        renderCollections();
        saveToLocalStorage();
    }
}


// Uppdaterad dragStartCollection funktion
function dragStartCollection(e) {
    const collectionElement = this.closest('.collection');
    if (collectionElement) {
        const collectionId = collectionElement.dataset.collectionId;

        draggedItem = {
            type: 'collection',
            element: collectionElement,
            collectionId: collectionId
        };
        setTimeout(() => collectionElement.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', collectionId);
    } else {
        console.warn('Collection element not found for drag start');
    }
}

// Uppdaterad dragStartBookmark funktion
function dragStartBookmark(e) {
    console.debug('dragStartBookmark initiated!');
    const bookmarkElement = this;
    const collectionId = bookmarkElement.closest('.collection').dataset.collectionId;
    const bookmarkId = bookmarkElement.dataset.bookmarkId;

    draggedItem = {
        type: 'bookmark',
        element: bookmarkElement,
        collectionId: collectionId,
        bookmarkId: bookmarkId
    };
    setTimeout(() => bookmarkElement.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'bookmark');
}
  
// Uppdaterad dragEnd funktion
function dragEnd(e) {
    if (draggedItem && draggedItem.element) {
        draggedItem.element.classList.remove('dragging');
    }
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }
    draggedItem = null;
    console.log('Drag ended, draggedItem reset');
}

// Uppdaterad dragOverCollection funktion
function dragOverCollection(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Kontrollera om vi har en collection som dras
    if (!draggedItem || draggedItem.type !== 'collection') {
        return;
    }

    // Hitta collections container
    const collectionsContainer = document.getElementById('collections');
    const collections = Array.from(collectionsContainer.querySelectorAll('.collection:not(.dragging)'));
    
    // Beräkna Y-position för muspekaren relativt till collections container
    const mouseY = e.clientY;
    
    // Hitta närmaste collection baserat på musposition
    let closestCollection = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    let shouldPlaceBefore = true;

    collections.forEach(collection => {
        const rect = collection.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const offset = mouseY - centerY;

        // Uppdatera closest om vi hittar en collection som är närmare
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closestCollection = collection;
            shouldPlaceBefore = true;
        } else if (offset > 0 && -offset > closestOffset) {
            closestOffset = -offset;
            closestCollection = collection;
            shouldPlaceBefore = false;
        }
    });

    // Ta bort existerande placeholder
    if (placeholder) {
        placeholder.remove();
    }

    // Skapa ny placeholder
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }

    // Placera placeholder på rätt plats
    if (!closestCollection) {
        // Om ingen närmare collection hittades, lägg till sist
        collectionsContainer.appendChild(placeholder);
    } else if (shouldPlaceBefore) {
        closestCollection.parentNode.insertBefore(placeholder, closestCollection);
    } else {
        closestCollection.parentNode.insertBefore(placeholder, closestCollection.nextSibling);
    }
}

// Uppdaterad dropCollection funktion
function dropCollection(e) {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.type !== 'collection') {
        return;
    }

    const droppedCollectionId = draggedItem.collectionId;
    const collections = bookmarkManagerData.collections;
    const droppedIndex = collections.findIndex(c => c.id === droppedCollectionId);
    
    if (droppedIndex === -1) {
        console.warn('Invalid collection index:', droppedIndex);
        return;
    }

    // Ta bort collection från sin nuvarande position
    const [movedCollection] = collections.splice(droppedIndex, 1);

    // Hitta den nya positionen baserat på placeholder
    if (placeholder && placeholder.parentNode) {
        const allCollections = Array.from(document.querySelectorAll('.collection'));
        const placeholderIndex = Array.from(placeholder.parentNode.children)
            .filter(el => el.classList.contains('collection') || el === placeholder)
            .indexOf(placeholder);

        // Justera index om den dragna collection var före placeholder
        const adjustedIndex = placeholderIndex < droppedIndex ? placeholderIndex : placeholderIndex - 1;
        
        // Sätt in collection på den nya positionen
        collections.splice(adjustedIndex, 0, movedCollection);
        movedCollection.lastModified = Date.now();
    } else {
        // Om ingen placeholder hittas, lägg till sist
        collections.push(movedCollection);
        movedCollection.lastModified = Date.now();
    }

    // Rensa upp och rendera om
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder = null;
    draggedItem = null;
    
    bookmarkManagerData.collections.forEach((collection, index) => {
        collection.position = index;
        collection.lastModified = Date.now();
    });

    saveToLocalStorage();
    renderCollections();
}

// Lägg även till denna hjälpfunktion för att förhindra drop på empty message
function addEmptyMessageListeners(emptyMessage) {
    emptyMessage.addEventListener('dragover', (e) => {
        // Förhindra drop på empty message för collections
        if (draggedItem && draggedItem.type === 'collection') {
            e.preventDefault();
            e.stopPropagation();
            emptyMessage.style.backgroundColor = '#ffebee'; // Visuell indikation att drop inte är tillåtet
        }
    });

    emptyMessage.addEventListener('dragleave', (e) => {
        emptyMessage.style.backgroundColor = ''; // Återställ style
    });

    emptyMessage.addEventListener('drop', (e) => {
        if (draggedItem && draggedItem.type === 'collection') {
            e.preventDefault();
            e.stopPropagation();
            console.warn('Prevented drop of collection on empty message');
            return;
        }
    });
}

        function dragOverBookmarkContainer(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItem && (draggedItem.type === 'bookmark' || draggedItem.type === 'chromeTab')) {
                this.classList.add('drag-over');
            }
        }

        function dragLeaveBookmarkContainer(e) {
            this.classList.remove('drag-over');
        }

// Uppdaterad dragOverBookmark funktion
function dragOverBookmark(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItem && draggedItem.type === 'bookmark' && draggedItem.element !== this) {
        const bookmarkElement = this;
        const bookmarksContainer = bookmarkElement.parentElement;

        const rect = bookmarkElement.getBoundingClientRect();
        const midY = rect.top + (rect.height / 2);

        if (e.clientY < midY) {
            bookmarksContainer.insertBefore(draggedItem.element, bookmarkElement);
        } else {
            bookmarksContainer.insertBefore(draggedItem.element, bookmarkElement.nextSibling);
        }
    }
}

// Uppdaterad dropBookmark funktion
// Updated dropBookmark function with proper position recalculation
function dropBookmark(e) {
    e.preventDefault();
    if (draggedItem && draggedItem.type === 'bookmark') {
        const fromCollectionId = draggedItem.collectionId;
        const fromBookmarkId = draggedItem.bookmarkId;

        const toBookmarkElement = this;
        const toCollectionElement = toBookmarkElement.closest('.collection');
        const toCollectionId = toCollectionElement.dataset.collectionId;

        const fromCollection = bookmarkManagerData.collections.find(c => c.id === fromCollectionId);
        const toCollection = bookmarkManagerData.collections.find(c => c.id === toCollectionId);

        if (fromCollection && toCollection) {
            // Find and remove the bookmark from source collection
            const movedBookmarkIndex = fromCollection.bookmarks.findIndex(b => b.id === fromBookmarkId);
            if (movedBookmarkIndex !== -1) {
                const movedBookmark = fromCollection.bookmarks.splice(movedBookmarkIndex, 1)[0];
                movedBookmark.lastModified = Date.now();
                movedBookmark.deleted = true;

                // Find the position for insertion in destination collection
                const bookmarksContainer = toBookmarkElement.parentElement;
                const allBookmarkElements = Array.from(bookmarksContainer.querySelectorAll('.bookmark'));
                const dropIndex = allBookmarkElements.indexOf(toBookmarkElement);

                // Insert the bookmark at the correct position
                toCollection.bookmarks.splice(dropIndex, 0, movedBookmark);

                // Recalculate positions for all bookmarks in the destination collection
                toCollection.bookmarks.forEach((bookmark, index) => {
                    bookmark.position = index;
                    bookmark.lastModified = Date.now(); // Update lastModified for position changes
                });

                // Recalculate positions for all bookmarks in the source collection if it's different
                if (fromCollectionId !== toCollectionId) {
                    fromCollection.bookmarks.forEach((bookmark, index) => {
                        bookmark.position = index;
                        bookmark.lastModified = Date.now(); // Update lastModified for position changes
                    });
                    fromCollection.lastModified = Date.now();
                }

                // Update the destination collection's lastModified timestamp
                toCollection.lastModified = Date.now();

                saveToLocalStorage();
                renderCollections();
            }
        }
    }
    draggedItem = null;
}

// Uppdaterad dropBookmarkContainer funktion
function dropBookmarkContainer(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    if (draggedItem) {
        const collectionElement = this.closest('.collection');
        const collectionId = collectionElement.dataset.collectionId;
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);

        if (collection) {
            if (draggedItem.type === 'chromeTab') {
                const newBookmark = {
                    id: generateUUID(),
                    title: draggedItem.data.title,
                    url: draggedItem.data.url,
                    description: '',
                    icon: draggedItem.data.icon || 'default-icon.png',
                    lastModified: Date.now(),
                    deleted: false
                };
                collection.bookmarks.push(newBookmark);
                collection.lastModified = Date.now();
            } else if (draggedItem.type === 'bookmark') {
                const fromCollectionId = draggedItem.collectionId;
                const fromBookmarkId = draggedItem.bookmarkId;
                const fromCollection = bookmarkManagerData.collections.find(c => c.id === fromCollectionId);
                
                if (fromCollection) {
                    const movedBookmarkIndex = fromCollection.bookmarks.findIndex(b => b.id === fromBookmarkId);
                    if (movedBookmarkIndex !== -1) {
                        const movedBookmark = fromCollection.bookmarks.splice(movedBookmarkIndex, 1)[0];
                        collection.bookmarks.push(movedBookmark);
                        
                        fromCollection.lastModified = Date.now();
                        collection.lastModified = Date.now();
                    }
                }
            }
            
            saveToLocalStorage();
            renderCollections();
        }
    }
    draggedItem = null;
}

// Ny funktion för att skapa Chrome-flik element
function createChromeTabElement(tab, windowId) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab';
    tabDiv.draggable = true;
    tabDiv.dataset.windowId = windowId;
    tabDiv.dataset.tabId = tab.id;

    const tabIcon = document.createElement('img');
    tabIcon.src = tab.favIconUrl || 'default-icon.png';
    tabDiv.appendChild(tabIcon);

    const tabTitle = document.createElement('span');
    tabTitle.className = 'tab-title';
    tabTitle.textContent = tab.title;
    tabTitle.title = tab.url;
    tabDiv.appendChild(tabTitle);

    tabDiv.addEventListener('dragstart', (e) => {
        draggedItem = {
            type: 'chromeTab',
            data: {
                title: tab.title,
                url: tab.url,
                icon: tab.favIconUrl,
                windowId: windowId,
                tabId: tab.id
            }
        };
        e.dataTransfer.setData('text/plain', 'chromeTab');
    });

    return tabDiv;
}

// Funktion för att visa reservinnehåll
function displayFallbackContent(contentDiv) {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'window';
    fallbackDiv.innerHTML = `
        <div class="window-title">Chrome Tabs Not Available</div>
        <div class="tabs-list" style="display: block;">
            <div class="tab" draggable="true">
                <img src="https://www.google.com/chrome/static/images/chrome-logo.svg" alt="Chrome Web Store" width="16" height="16">
                <span class="tab-title" title="https://chromewebstore.google.com/category/extensions?utm_source=ext_app_menu">Install the TheTab.Ninja extension for tab-info</span>
            </div>
        </div>
    `;

    fallbackDiv.querySelector('.tab').addEventListener('dragstart', (e) => {
        draggedItem = {
            type: 'chromeTab',
            data: {
                title: "Install the TheTab.Ninja extension for tab-info",
                url: "https://chromewebstore.google.com/category/extensions?utm_source=ext_app_menu",
                icon: "https://www.google.com/chrome/static/images/chrome-logo.svg"
            }
        };
        e.dataTransfer.setData('text/plain', 'chromeTab');
    });

    contentDiv.appendChild(fallbackDiv);
}

// Uppdaterad fetchChromeTabs funktion
function fetchChromeTabs() {
    try {
        const extensionId = extId;  // Ersätt med ditt extension-ID
        //chrome.runtime.sendMessage(extensionId, { action: "getTabs" }, (response) => {
            chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = '';

            if (response && response.length > 0) {
                response.forEach((window) => {
                    const windowDiv = document.createElement('div');
                    windowDiv.className = 'window';
                    const windowTitle = document.createElement('div');
                    windowTitle.className = 'window-title';
                    windowTitle.textContent = `Window ID: ${window.windowId} (${window.tabs.length} tabs)`;
                    const tabsList = document.createElement('div');
                    tabsList.className = 'tabs-list';

                    const isOpen = bookmarkManagerData.chromeWindowStates[window.windowId] !== undefined ? 
                        bookmarkManagerData.chromeWindowStates[window.windowId] : true;
                    tabsList.style.display = isOpen ? 'block' : 'none';

                    window.tabs.forEach((tab) => {
                        const tabDiv = createChromeTabElement(tab, window.windowId);
                        tabsList.appendChild(tabDiv);
                    });
                    windowDiv.appendChild(windowTitle);
                    windowDiv.appendChild(tabsList);
                    contentDiv.appendChild(windowDiv);
                    windowTitle.addEventListener('click', () => {
                        const newState = tabsList.style.display === 'none' ? 'block' : 'none';
                        tabsList.style.display = newState;
                        bookmarkManagerData.chromeWindowStates[window.windowId] = newState === 'block';
                        saveToLocalStorage();
                    });
                });
            } else {
                console.error('Failed to fetch Chrome tabs');
                displayFallbackContent(contentDiv);
            }
        });
    } catch(error) {
        console.error('Error fetching Chrome tabs:', error);
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = '';
        displayFallbackContent(contentDiv);
    }
}

// Uppdaterad togglePane funktion
function togglePane(paneId) {
    const pane = document.getElementById(paneId);
    const isOpen = !pane.classList.contains('closed');
    pane.classList.toggle('closed');
    
    const content = pane.querySelector('#settings, #content');
    if (content) {
        content.classList.toggle('hidden', isOpen);
    }

    if (paneId === 'leftPane') {
        bookmarkManagerData.leftPaneOpen = !isOpen;
    } else if (paneId === 'rightPane') {
        bookmarkManagerData.rightPaneOpen = !isOpen;
    }

    saveToLocalStorage();
}

// Uppdaterad applyPaneStates funktion
function applyPaneStates() {
    const leftPane = document.getElementById('leftPane');
    const rightPane = document.getElementById('rightPane');

    if (!bookmarkManagerData.leftPaneOpen) {
        leftPane.classList.add('closed');
        leftPane.querySelector('#settings').classList.add('hidden');
    }

    if (!bookmarkManagerData.rightPaneOpen) {
        rightPane.classList.add('closed');
        rightPane.querySelector('#content').classList.add('hidden');
    }
}


        document.getElementById('addCollection').addEventListener('click', addCollection);
        document.getElementById('openInNewTab').addEventListener('change', (e) => {
            openInNewTab = e.target.checked;
            saveToLocalStorage();
        });


        document.getElementById('importFile').addEventListener('change', importBookmarks);

// Funktion för att lägga till drag-and-drop lyssnare på bokmärken
function addBookmarkDragListeners(bookmarkElement) {
    bookmarkElement.addEventListener('dragstart', dragStartBookmark);
    bookmarkElement.addEventListener('dragend', dragEnd);
    bookmarkElement.addEventListener('dragover', dragOverBookmark);
    bookmarkElement.addEventListener('drop', dropBookmark);
}

function setupGlobalDragListeners() {
    document.addEventListener('dragstart', (e) => {
        console.log('Global dragstart event:', e.target);
    }, true);

    document.addEventListener('dragend', (e) => {
        console.log('Global dragend event:', e.target);
        if (!draggedItem) {
            console.warn('draggedItem was null at dragend');
        }
    }, true);

    document.addEventListener('drop', (e) => {
        console.log('Global drop event:', e.target);
        if (!draggedItem) {
            console.warn('draggedItem was null at drop');
        }
    }, true);
}

// Anropa denna funktion när sidan laddas
document.addEventListener('DOMContentLoaded', setupGlobalDragListeners);

// Funktion för att lägga till drag-and-drop lyssnare på samlingar
function addCollectionDragListeners(collectionElement) {
    const dragHandle = collectionElement.querySelector('.drag-handle');
    if (dragHandle) {
        dragHandle.addEventListener('dragstart', dragStartCollection);
        dragHandle.addEventListener('dragend', dragEnd);
    }

    // Lägg till dragover på collection containern
    const collectionsContainer = document.getElementById('collections');
    if (collectionsContainer && !collectionsContainer._hasListeners) {
        collectionsContainer.addEventListener('dragover', dragOverCollection);
        collectionsContainer.addEventListener('drop', dropCollection);
        collectionsContainer._hasListeners = true;
    }

    const bookmarksContainer = collectionElement.querySelector('.bookmarks');
    if (bookmarksContainer) {
        bookmarksContainer.addEventListener('dragover', dragOverBookmarkContainer);
        bookmarksContainer.addEventListener('dragleave', dragLeaveBookmarkContainer);
        bookmarksContainer.addEventListener('drop', dropBookmarkContainer);
    }
}

// Initialiseringskod
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderCollections();
    fetchChromeTabs();
    setInterval(fetchChromeTabs, 5000);

    document.getElementById('addCollection').addEventListener('click', addCollection);
    
    document.getElementById('openInNewTab').addEventListener('change', (e) => {
        bookmarkManagerData.openInNewTab = e.target.checked;
        saveToLocalStorage();
    });

    // Ny uppdaterad dark mode event listener
    document.getElementById('darkMode').addEventListener('change', (e) => {
        bookmarkManagerData.darkMode = e.target.checked;
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        saveToLocalStorage();
    });

    document.getElementById('importFile').addEventListener('change', importBookmarks);

    // GitHub settings event listeners
    document.getElementById('githubUsername').addEventListener('change', (e) => {
        bookmarkManagerData.githubConfig.username = e.target.value;
        saveToLocalStorage();
        updateSyncButtonVisibility();
    });

    document.getElementById('githubRepo').addEventListener('change', (e) => {
        bookmarkManagerData.githubConfig.repo = e.target.value;
        saveToLocalStorage();
        updateSyncButtonVisibility();
    });

    document.getElementById('githubPat').addEventListener('change', (e) => {
        bookmarkManagerData.githubConfig.pat = e.target.value;
        saveToLocalStorage();
        updateSyncButtonVisibility();
    });

    document.getElementById('syncButton').addEventListener('click', synchronizeWithGitHub);

    // Funktion för att uppdatera sync-knappens synlighet
    function updateSyncButtonVisibility() {
        const syncButton = document.getElementById('syncButton');
        syncButton.style.display = isGitHubConfigValid() ? 'flex' : 'none';
    }

    // Initialisera GitHub-fälten och sync-knappens synlighet
    document.getElementById('githubUsername').value = bookmarkManagerData.githubConfig.username || '';
    document.getElementById('githubRepo').value = bookmarkManagerData.githubConfig.repo || '';
    document.getElementById('githubPat').value = bookmarkManagerData.githubConfig.pat || '';
    updateSyncButtonVisibility();
});