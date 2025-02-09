//const extId = 'ekincidnpifabcbbchcapcahaoeoccgp' //test
const extId = 'bnmjmbmlfohkaghofdaadenippkgpmab'; //1.06
//https://wallpapersden.com/

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

document.addEventListener('DOMContentLoaded', () => {
    const backgroundSelect = document.getElementById('backgroundSelect');
    const savedBackground = localStorage.getItem('backgroundImage');

    if (savedBackground) {
        backgroundSelect.value = savedBackground;
        setBackground(savedBackground);
    }

    backgroundSelect.addEventListener('change', (event) => {
        const selectedBackground = event.target.value;
        setBackground(selectedBackground);
        localStorage.setItem('backgroundImage', selectedBackground);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const backgroundThumbnailsContainer = document.getElementById('backgroundThumbnails');
    // Lista med filnamn för dina bakgrundsbilder (se till att de finns i 'images/' mappen)
    const backgroundImages = [
        'wp_none.png',
        'wp_img01.png',
        'wp_img02.png',
        'wp_img03.png',
        'wp_img05.png',
        'wp_img06.png',
        'wp_img07.png',
        'wp_img08.png',
        'wp_img09.png',
        'wp_img10.png',
        'wp_img11.png',
        'wp_img12.png',
        'wp_img13.png',
        'wp_img14.png',
        'wp_img15.png'
    ];
    const savedBackground = localStorage.getItem('backgroundImage');
    let selectedThumbnail = null; // Variabel för att hålla reda på den valda miniatyren

    // Funktion för att sätta bakgrundsbild
    function setBackground(imageName) {
        if (imageName === 'wp_none.png') {
            document.body.style.backgroundImage = 'none'; // Or document.body.style.backgroundImage = '';
        } else {
            document.body.style.backgroundImage = `url("large_${imageName}")`;
        }
    }

    // Funktion för att markera en miniatyr som vald
    function selectThumbnail(thumbnailElement) {
        // Avmarkera tidigare vald miniatyr (om det finns någon)
        if (selectedThumbnail) {
            selectedThumbnail.classList.remove('selected');
        }
        thumbnailElement.classList.add('selected');
        selectedThumbnail = thumbnailElement;
    }

    // Generera miniatyrer och lägg till event listeners
    backgroundImages.forEach(imageName => {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = `${imageName}`; // Sökväg till miniatyrbilden
        thumbnailImg.alt = `Bakgrundsbild ${imageName}`;
        thumbnailImg.className = 'background-thumbnail';
        thumbnailImg.dataset.imageName = imageName; // Lagra bildnamnet i data-attributet

        // Markera som vald om det är den sparade bakgrunden
        if (savedBackground === imageName) {
            selectThumbnail(thumbnailImg);
            setBackground(imageName); // Sätt bakgrundsbilden direkt vid start
        }

        thumbnailImg.addEventListener('click', () => {
            const imageName = thumbnailImg.dataset.imageName;
            setBackground(imageName);
            localStorage.setItem('backgroundImage', imageName);
            selectThumbnail(thumbnailImg); // Markera den klickade miniatyren som vald
        });

        backgroundThumbnailsContainer.appendChild(thumbnailImg);
    });

    // Om ingen sparad bakgrund, välj den första som standard och markera dess thumbnail
    if (!savedBackground && backgroundImages.length > 0) {
        const defaultImageName = backgroundImages[0];
        const defaultThumbnail = backgroundThumbnailsContainer.querySelector(`.background-thumbnail[data-image-name="${defaultImageName}"]`);
        if (defaultThumbnail) {
            selectThumbnail(defaultThumbnail);
            setBackground(defaultImageName);
            localStorage.setItem('backgroundImage', defaultImageName);
        }
    }
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
    // Skicka all data inklusive raderade bokmärken/collections
    const response = await chrome.runtime.sendMessage({
        action: 'pushToGitHub',
        config: bookmarkManagerData.githubConfig,
        content: content // ✅ Inkludera allt
    });
    
    return response.success;
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
        console.log('Sync already in progress');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton.classList.add('syncing');
    isSyncing = true;

    try {

        
        // Steg 1: Hämta data från båda källor
        const [localData, rawRemoteData] = await Promise.all([
            loadFromLocalStorage(),
            fetchFromGitHub().catch(async error => {
                if (error.message.includes('404') && retryCount === 0) {
                    console.log('Creating initial remote file');
                    await pushToGitHub(bookmarkManagerData);
                    return null;
                }
                throw error;
            })
        ]);

        // Steg 2: Enricha remote-data
        const remoteData = rawRemoteData ? {
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            ...rawRemoteData
        } : null;

        // Steg 3: Validera datastrukturer
        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid remote data structure from GitHub');
        }

        // Steg 4: Merga collections
        const mergedCollections = mergeDatasets(
            (localData?.collections || []),
            (remoteData?.collections || [])
        );

        // Steg 5: Uppdatera lokalt tillstånd
        const newData = {
            ...bookmarkManagerData,
            collections: mergedCollections,
            lastSynced: Date.now()
        };

        // Steg 6: Pusha mergad data till GitHub (inkl. raderade)
        await pushToGitHub({
            ...newData,
            collections: newData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            }))
        });

        // Steg 7: Uppdatera UI och lagring
        bookmarkManagerData = newData;
        renderCollections();
        saveToLocalStorage();

    } catch (error) {
        console.error('Sync error:', error);
        alert(`Sync failed: ${error.message}`);
        if (retryCount < 2) {
            console.log(`Retrying sync (attempt ${retryCount + 1})`);
            await synchronizeWithGitHub(retryCount + 1);
        }
    } finally {
        isSyncing = false;
        syncButton.classList.remove('syncing');
    }
}

// Hjälpfunktioner för merge-logik
function mergeDatasets(localCollections, remoteCollections) {
    const allCollections = [...localCollections, ...remoteCollections];
    const collectionMap = new Map();
    const globalBookmarks = new Map();

    // Bygg en global index av alla bokmärken
    allCollections.forEach(collection => {
        collection.bookmarks.forEach(bookmark => {
            const existing = globalBookmarks.get(bookmark.id);
            if (!existing || existing.lastModified < bookmark.lastModified) {
                globalBookmarks.set(bookmark.id, {
                    ...bookmark,
                    parentCollection: collection.id
                });
            }
        });
    });

    // Bygg upp collections baserat på senaste versionen
    for (const collection of allCollections) {
        const existing = collectionMap.get(collection.id) || {
            ...collection,
            bookmarks: [],
            lastModified: 0
        };

        // Uppdatera collection metadata
        collectionMap.set(collection.id, {
            ...existing,
            name: mergeProperty(existing.name, collection.name),
            lastModified: Math.max(existing.lastModified, collection.lastModified),
            bookmarks: [] // Töm temporärt
        });
    }

    // Lägg till bokmärken i rätt collection
    globalBookmarks.forEach((bookmark, id) => {
        const collection = collectionMap.get(bookmark.parentCollection);
        if (collection) {
            collection.bookmarks.push(bookmark);
        }
    });

    // Sortera och returnera
    return Array.from(collectionMap.values()).map(collection => ({
        ...collection,
        bookmarks: collection.bookmarks
            .filter(b => !b.deleted)
            .sort((a, b) => a.position - b.position)
    }));
}

function mergeBookmarks(localBookmarks, remoteBookmarks) {
    const bookmarkMap = new Map();

    // Först lägg till alla lokala bokmärken
    for (const bookmark of localBookmarks) {
        const existing = bookmarkMap.get(bookmark.id);
        if (!existing || existing.lastModified < bookmark.lastModified) {
            bookmarkMap.set(bookmark.id, bookmark);
        }
    }

    // Sedan merga med remote bokmärken
    for (const bookmark of remoteBookmarks) {
        const existing = bookmarkMap.get(bookmark.id);
        if (!existing) {
            bookmarkMap.set(bookmark.id, bookmark);
        } else {
            const merged = mergeBookmarkVersions(existing, bookmark);
            bookmarkMap.set(merged.id, merged);
        }
    }

    return Array.from(bookmarkMap.values());
}

function mergeBookmarkVersions(local, remote) {
    // 1. Om någon version är raderad, använd senaste raderingen
    if (local.deleted || remote.deleted) {
      const latest = local.lastModified > remote.lastModified ? local : remote;
      return {...latest, deleted: true};
    }
    
    // 2. Annars, använd senaste icke-raderade versionen
    return local.lastModified > remote.lastModified ? local : remote;
  }

function validateDataStructure(data) {
    if (!data || data === null) return true;
    if (data.collections && !Array.isArray(data.collections)) return false;
    
    return data.collections.every(c => {
        // Generera ID om det saknas
        if (typeof c.id !== 'string') c.id = generateUUID();
        // Säkerställ att bookmarks är en array
        if (!Array.isArray(c.bookmarks)) c.bookmarks = [];
        return true;
    });
}

function mergeProperty(current, incoming) {
    return current === incoming ? current : 
        (current || incoming);
}

// Hjälpfunktion för att hämta senaste bookmark-versionen
function getLatestBookmark(local, remote) {
    if (!local) return remote?.deleted ? null : remote;
    if (!remote) return local?.deleted ? null : local;

    // Prioritera icke-raderade versioner ENDAST om de är nyare
    if (local.deleted && !remote.deleted) {
        return local.lastModified > remote.lastModified ? local : remote;
    }
    if (!local.deleted && remote.deleted) {
        return remote.lastModified > local.lastModified ? remote : local;
    }

    // Annars välj senaste versionen
    return local.lastModified > remote.lastModified ? local : remote;
}

// Hjälpfunktion för att generera unika ID:n
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function exportBookmarks() {
    const dataStr = JSON.stringify(bookmarkManagerData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookmarks.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function deleteAllCollections() {
    if (confirm('Are you sure you want to reset ALL collections to default? This cannot be undone.')) {
        // Ersätt med standardcollection
        const defaultCollection = enrichCollection(createDefaultCollection());
        bookmarkManagerData.collections = [defaultCollection];
        saveToLocalStorage();
        renderCollections();
        alert('All collections have been reset to default.');
    }
}

function importBookmarksFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validera att filen har rätt struktur
            if (!importedData || !Array.isArray(importedData.collections)) {
                throw new Error('Invalid file format: Missing collections array');
            }

            // Berika importerade data
            const enrichedCollections = importedData.collections.map(enrichCollection);

            // Ersätt befintliga collections med de importerade
            bookmarkManagerData.collections = enrichedCollections;

            // Uppdatera UI och spara till localStorage
            renderCollections();
            saveToLocalStorage();
            alert('Bookmarks imported successfully!');
        } catch (error) {
            console.error('Error importing bookmarks:', error);
            alert(`Error importing bookmarks: ${error.message}`);
        }
    };
    reader.onerror = function(error) {
        console.error('File read error:', error);
        alert('Error reading file. Please try again.');
    };
    reader.readAsText(file);
}

async function importTobyBookmarks() {
    const fileInput = document.getElementById('importTobyFile');
    const file = fileInput.files[0];
  
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.version === 3 && Array.isArray(importedData.lists)) {
                    const newCollections = await Promise.all(importedData.lists.map(async list => {
                        const newCollection = enrichCollection({
                            name: list.title,
                            isOpen: true,
                            bookmarks: []
                        });
    
                        if (Array.isArray(list.cards)) {
                            newCollection.bookmarks = await Promise.all(list.cards.map(async card => {
                                return enrichBookmark({
                                    title: card.customTitle || card.title,
                                    url: card.url,
                                    description: card.customDescription || '',
                                    icon: await getFavicon(card.url)
                                });
                            }));
                        }
    
                        return newCollection;
                    }));
    
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
        let parsedData = null;

        if (data) {
            parsedData = JSON.parse(data);
            
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
        }else{
            // Lägg till standardcollection vid första start
            const defaultCollection = enrichCollection(createDefaultCollection());
            bookmarkManagerData.collections.push(defaultCollection);
            saveToLocalStorage(); 
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
        return parsedData || bookmarkManagerData;
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
        return bookmarkManagerData;
    }
}

// Uppdaterad renderCollections funktion
function renderCollections() {
    const collectionsContainer = document.getElementById('collections');
    collectionsContainer.innerHTML = '';

    const sortedCollections = bookmarkManagerData.collections
        .filter(c => !c.deleted)
        .sort((a, b) => a.position - b.position);

    sortedCollections.forEach((collection) => {
        const collectionElement = document.createElement('div');
        collectionElement.className = `collection ${collection.isOpen ? 'is-open' : ''}`;
        collectionElement.setAttribute('draggable', true);
        collectionElement.dataset.collectionId = collection.id;

        // Collection Header
        const header = document.createElement('div');
        header.className = 'collection-header';

        // Drag Handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '☰';
        dragHandle.setAttribute('draggable', true);

        // Title Area
        const titleArea = document.createElement('div');
        titleArea.className = 'collection-title-area';
        
        // Collection Title
        const title = document.createElement('h2');
        title.textContent = collection.name;

        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-collection';
        toggleBtn.textContent = collection.isOpen ? '∨' : '∧';

        // Action Buttons
        const actions = document.createElement('div');
        actions.className = 'collection-actions';

        // Skapa alla knappar
        const buttons = [
            { className: 'launch-collection', text: '🚀', title: 'Open all bookmarks as an Chromegroup', action: () => launchCollection(collection.id) },
            { className: 'add-bookmark', text: '+', title: 'Add bookmark', action: () => addBookmark(collection.id) },
            { className: 'edit-collection', text: '✏️', title: 'Edit collection', action: () => editCollection(collection.id) },
            { className: 'move-collection', text: '▲', title: 'Move up', action: () => moveCollection(collection.id, -1) },
            { className: 'move-collection', text: '▼', title: 'Move down', action: () => moveCollection(collection.id, 1) },
            { className: 'delete-collection', text: '🗑️', title: 'Delete collection', action: () => deleteCollection(collection.id) }
        ];

        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = `collection-button ${btnConfig.className}`;
            btn.textContent = btnConfig.text;
            btn.title = btnConfig.title;
            btn.addEventListener('click', btnConfig.action);
            actions.appendChild(btn);
        });

        // Bygg ihop headern
        titleArea.appendChild(dragHandle);
        titleArea.appendChild(title);
        titleArea.appendChild(toggleBtn);
        header.appendChild(titleArea);
        header.appendChild(actions);

        // Bookmarks Container
        const bookmarksContainer = document.createElement('div');
        bookmarksContainer.className = 'bookmarks';
        bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';

        // Lägg till bokmärken (filtrera bort raderade)
        collection.bookmarks
            .filter(b => !b.deleted)
            .sort((a, b) => a.position - b.position)
            .forEach(bookmark => {
                const bookmarkElement = createBookmarkElement(bookmark, collection.id);
                bookmarksContainer.appendChild(bookmarkElement);
            });

        // Lägg till "dra hit" om tom
        if (bookmarksContainer.children.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-collection-message';
            emptyMsg.textContent = 'Drag bookmarks here';
            emptyMsg.dataset.collectionId = collection.id;
            addEmptyMessageListeners(emptyMsg);
            bookmarksContainer.appendChild(emptyMsg);
        }

        // Event Listeners
        dragHandle.addEventListener('dragstart', dragStartCollection);
        dragHandle.addEventListener('dragend', dragEnd);
        toggleBtn.addEventListener('click', () => toggleCollection(collection.id));

        // Sammansätt allt
        collectionElement.appendChild(header);
        collectionElement.appendChild(bookmarksContainer);
        collectionsContainer.appendChild(collectionElement);

        // Draghanterare för hela collection
        addCollectionDragListeners(collectionElement);

        // Trigger the filter to reapply after rendering
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            const event = new Event('input');
            searchBox.dispatchEvent(event);
        }
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
    if (bookmark.deleted) return null; // ❌ Filtrera här
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

    // Lägg till hover-effekter
    bookmarkElement.addEventListener('dragover', function(e) {
        this.style.transform = 'scale(1.02)';
        this.style.zIndex = '1000';
    });

    bookmarkElement.addEventListener('dragleave', function(e) {
        this.style.transform = 'scale(1)';
        this.style.zIndex = 'auto';
    });

    // Uppdaterad dragstart-effekt
    bookmarkElement.addEventListener('dragstart', function(e) {
        this.style.opacity = '0.5';
        this.style.transform = 'scale(0.95)';
        // ... resten av befintlig kod ...
    });

    bookmarkElement.addEventListener('dragend', function(e) {
        this.style.opacity = '1';
        this.style.transform = 'scale(1)';
        this.style.zIndex = 'auto';
        // ... resten av befintlig kod ...
    });

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
    return {
        ...bookmark,
        parentCollection: bookmark.parentCollection || generateUUID(), // Behåll befintligt eller generera nytt
        id: bookmark.id || generateUUID(),
        lastModified: bookmark.lastModified || Date.now(),
        deleted: bookmark.deleted || false
    };
}


// Helper function to enrich a single collection
function enrichCollection(collection) {
    return {
        id: generateUUID(),
        name: 'New Collection',
        isOpen: true,
        lastModified: Date.now(),
        deleted: false,
        position: 0,
        bookmarks: [],
        ...collection,
        bookmarks: (collection.bookmarks || []).map(enrichBookmark)
    };
}

// Uppdaterad funktion för att lägga till en ny samling        
function addCollection() {
    const name = prompt('Enter collection name:');
    if (name) {
        bookmarkManagerData.collections.forEach(c => c.position++);

        const newCollection = {
            id: generateUUID(),
            name: name,
            isOpen: true,
            lastModified: Date.now(),
            deleted: false,
            position: 0, //bookmarkManagerData.collections.length,
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
    try {
        const title = prompt('Enter bookmark title:');        
        const url = prompt('Enter bookmark URL:', 'https://');
        const description = prompt('Enter bookmark description:');
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
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
            
            if (collection) {
                collection.bookmarks.push(newBookmark);
                collection.lastModified = Date.now();
                renderCollections();
            }
        }
    } catch (error) {
        handleBookmarkError(error);
    }
}

function handleBookmarkError(error) {
    console.error('Bookmark Error:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    
    // Visa felmeddelande i UI
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `Error: ${errorMessage}`;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
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
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
      const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        bookmark.deleted = true; // ✅ Sätt flagga
        bookmark.lastModified = Date.now(); // ✅ Uppdatera timestamp
        collection.lastModified = Date.now();
        renderCollections();
        saveToLocalStorage();
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
    
        chrome.runtime.sendMessage({ action: 'launchCollection', urls: urls, collectionName: collection.name },
        (response) => {
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
// Uppdaterad dragOverBookmark med bättre hantering av direktöverlappning
function dragOverBookmark(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedItem || draggedItem.type !== 'bookmark') return;

    const targetBookmark = this;
    const rect = targetBookmark.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const isBefore = yOffset < rect.height / 2;

    const container = targetBookmark.parentElement;
    const allBookmarks = Array.from(container.children).filter(el => el.classList.contains('bookmark'));
    const targetIndex = allBookmarks.indexOf(targetBookmark);

    // Ta bort befintlig placeholder
    if (placeholder && placeholder.parentNode === container) {
        container.removeChild(placeholder);
    }

    // Skapa ny placeholder om det behövs
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.style.height = `${rect.height}px`;
    }

    // Bestäm placering
    const insertPosition = isBefore ? targetIndex : targetIndex + 1;
    
    // Förhindra att placera i samma position
    if (allBookmarks[insertPosition] === draggedItem.element) return;

    container.insertBefore(placeholder, allBookmarks[insertPosition] || null);
}

// Förbättrad dropBookmark som hanterar direktöverlappning
function dropBookmark(e) {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.type !== 'bookmark') return;

    const targetCollection = this.closest('.collection');
    const fromCollectionId = draggedItem.collectionId;
    const toCollectionId = targetCollection.dataset.collectionId;
    
    const fromCollection = bookmarkManagerData.collections.find(c => c.id === fromCollectionId);
    const toCollection = bookmarkManagerData.collections.find(c => c.id === toCollectionId);

    if (!fromCollection || !toCollection) return;

    const bookmarkIndex = fromCollection.bookmarks.findIndex(b => b.id === draggedItem.bookmarkId);
    if (bookmarkIndex === -1) return;

    const [movedBookmark] = fromCollection.bookmarks.splice(bookmarkIndex, 1);
    const container = this.parentElement;
    const allBookmarks = Array.from(container.children).filter(el => el.classList.contains('bookmark'));
    
    // Hämta insert-position baserat på placeholder eller musposition
    let dropIndex = Array.from(container.children).indexOf(placeholder);
    
    // Fallback: Beräkna position baserat på muskoordinater
    if (dropIndex === -1) {
        const containerRect = container.getBoundingClientRect();
        const yPos = e.clientY - containerRect.top;
        dropIndex = Math.floor((yPos / containerRect.height) * toCollection.bookmarks.length);
    }

    // Begränsa index till giltigt intervall
    dropIndex = Math.max(0, Math.min(dropIndex, toCollection.bookmarks.length));

    // Uppdatera positioner
    movedBookmark.parentCollection = toCollectionId;
    movedBookmark.lastModified = Date.now();
    
    toCollection.bookmarks.splice(dropIndex, 0, movedBookmark);
    toCollection.lastModified = Date.now();

    // Uppdatera alla positioner
    toCollection.bookmarks.forEach((bookmark, index) => {
        bookmark.position = index;
    });

    // Rensa placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }

    renderCollections();
    saveToLocalStorage();
    draggedItem = null;
}

// Updated dropBookmark function with proper position recalculation


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

    // Skicka ett meddelande till background.js vid klick
    tabDiv.addEventListener('click', () => {
        if (!draggedItem) {
            chrome.runtime.sendMessage({
                action: 'switchToTab',
                tabId: tab.id,
                windowId: windowId
            });
        }
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

                    window.tabs.forEach((tabData) => {
                        console.log('Creating tab element with data:', tabData);  // Debug logg
                        const tabDiv = createChromeTabElement({
                            id: tabData.tabId,  // Här mappar vi om data
                            title: tabData.title,
                            url: tabData.url,
                            favIconUrl: tabData.favIconUrl
                        }, window.windowId);
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
            }
        });
    } catch(error) {
        console.error('Error:', error);
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

function createDefaultCollection() {
    return {
        name: "Kodar.Ninja",
        isOpen: true,
        bookmarks: [
            {
                title: "ThrustMe!",
                url: "https://kodarninja.itch.io/thrustme",
                description: "🚀Thrust Me is a thrilling space adventure with danger and treasure!🌟🕹️",
                icon: "https://kodarninja.itch.io/favicon.ico",
                id: "8c3c7744-9e1c-48f5-8e95-251a2effef80",
                deleted: false,
                lastModified: 1737456756973,
                position: 0
            },
            {
                title: "TheFile.Ninja",
                url: "https://thefile.ninja/",
                description: "A superfast, future-ready file manager powered by Everything.",
                icon: "https://thefile.ninja/favicon.ico",
                id: "2b9eea23-644a-4def-b94a-b4fc8fc6cddb",
                deleted: false,
                lastModified: 1737456756973,
                position: 5
            },
            {
                id: "1b82111d-5f1b-43d0-b188-a5cdaac95ced",
                title: "kodar.ninja - itch.io",
                url: "https://kodarninja.itch.io/",
                description: "",
                icon: "https://kodarninja.itch.io/favicon.ico",
                lastModified: 1737456756973,
                deleted: true,
                position: 14
            }
        ],
        id: "b7fea125-d5be-4068-84a5-040f57c70637",
        deleted: false,
        lastModified: 1737525179502,
        position: 0
    };
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


        document.getElementById('importTobyFile').addEventListener('change', importTobyBookmarks);

// Funktion för att lägga till drag-and-drop lyssnare på bokmärken
function addBookmarkDragListeners(bookmarkElement) {
    bookmarkElement.addEventListener('dragstart', dragStartBookmark);
    bookmarkElement.addEventListener('dragend', dragEnd);
    bookmarkElement.addEventListener('dragover', dragOverBookmark);
    bookmarkElement.addEventListener('drop', dropBookmark);
}

/*function setupGlobalDragListeners() {
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
*/
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

    document.getElementById('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importBookmarksFromFile(file);
        } else {
            alert('No file selected.');
        }
    });

    document.getElementById('exportButton').addEventListener('click', exportBookmarks);
    document.getElementById('importTobyFile').addEventListener('change', importTobyBookmarks);
    document.getElementById('deleteAllButton').addEventListener('click', deleteAllCollections);

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


    const searchBox = document.getElementById('searchBox');    
    if (searchBox) {
        setTimeout(() => {
            console.log('Focusing on search box');
            searchBox.focus();
        }, 100); // En fördröjning på 100 millisekunder (justera vid behov)
    }

    document.getElementById('searchBox').addEventListener('input', function() {
        const searchTerm = this.value.trim();
        applyFilter(searchTerm);
    });

    function applyFilter(searchTerm) {
        const collections = document.querySelectorAll('.collection');
        const isCollectionSearch = searchTerm.startsWith('#');
        const isGlobalSearch = searchTerm.startsWith('%');
        
        // Hantera OR-operatorn
        let searchTerms = [];
        if (searchTerm) {
            const rawTerms = searchTerm.split('|');
            searchTerms = rawTerms
                .map(term => term.trim().toLowerCase())
                .filter(term => term.length > 0);
        }
    
        collections.forEach(collectionElement => {
            const collectionId = collectionElement.dataset.collectionId;
            const collectionData = bookmarkManagerData.collections.find(c => c.id === collectionId);
            const bookmarksContainer = collectionElement.querySelector('.bookmarks');
            const bookmarkElements = bookmarksContainer.querySelectorAll('.bookmark');
            let showCollection = false;
            let hasVisibleBookmarks = false;
    
            if (!searchTerm) {
                collectionElement.classList.remove('hidden');
                bookmarkElements.forEach(b => b.classList.remove('hidden'));
                return;
            }
    
            // Dela upp söktermer baserat på söktyp
            if (isCollectionSearch) {
                const collectionSearchTerms = searchTerms.map(t => t.replace(/^#/, ''));
                showCollection = collectionSearchTerms.some(term => 
                    collectionData.name.toLowerCase().includes(term)
                );
                bookmarkElements.forEach(b => b.classList.toggle('hidden', !showCollection));
                hasVisibleBookmarks = showCollection;
            } 
            else if (isGlobalSearch) {
                const globalSearchTerms = searchTerms.map(t => t.replace(/^%/, ''));
                const collectionMatch = globalSearchTerms.some(term => 
                    collectionData.name.toLowerCase().includes(term)
                );
                
                bookmarkElements.forEach(bookmarkElement => {
                    const bookmarkId = bookmarkElement.dataset.bookmarkId;
                    const bookmarkData = collectionData.bookmarks.find(b => b.id === bookmarkId);
                    const bookmarkMatch = globalSearchTerms.some(term => 
                        bookmarkData.title.toLowerCase().includes(term) ||
                        bookmarkData.url.toLowerCase().includes(term)
                    );
                    
                    bookmarkElement.classList.toggle('hidden', !bookmarkMatch);
                    if (bookmarkMatch) hasVisibleBookmarks = true;
                });
                
                showCollection = collectionMatch || hasVisibleBookmarks;
                if (collectionMatch) {
                    bookmarkElements.forEach(b => b.classList.remove('hidden'));
                }
            } 
            else {
                bookmarkElements.forEach(bookmarkElement => {
                    const bookmarkId = bookmarkElement.dataset.bookmarkId;
                    const bookmarkData = collectionData.bookmarks.find(b => b.id === bookmarkId);
                    const bookmarkMatch = searchTerms.some(term => 
                        bookmarkData.title.toLowerCase().includes(term) ||
                        bookmarkData.url.toLowerCase().includes(term)
                    );
                    
                    bookmarkElement.classList.toggle('hidden', !bookmarkMatch);
                    if (bookmarkMatch) hasVisibleBookmarks = true;
                });
                showCollection = hasVisibleBookmarks;
            }
    
            // Hantera visning av collection
            const bookmarksContainerElement = collectionElement.querySelector('.bookmarks');
            const toggleButton = collectionElement.querySelector('.toggle-collection');
            
            if (showCollection && !collectionElement.classList.contains('is-open')) {
                collectionElement.classList.add('is-open');
                bookmarksContainerElement.style.display = 'flex';
                if (toggleButton) toggleButton.textContent = '∨';
                // Removed persistent update: collectionData.isOpen is no longer modified during filtering.
                // if (collectionData) collectionData.isOpen = true;
            } else if (!searchTerm) {
                if (collectionData && !collectionData.isOpen) {
                    collectionElement.classList.remove('is-open');
                    bookmarksContainerElement.style.display = 'none';
                    if (toggleButton) toggleButton.textContent = '∧';
                }
            }
    
            collectionElement.classList.toggle('hidden', !showCollection);
        });
    }
});
