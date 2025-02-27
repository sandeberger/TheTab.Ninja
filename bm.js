//const extId = 'ekincidnpifabcbbchcapcahaoeoccgp' //test
const extId = 'bnmjmbmlfohkaghofdaadenippkgpmab'; //1.08
//https://wallpapersden.com/

let bookmarkManagerData = {
    collections: [],
    openInNewTab: false,
    chromeWindowStates: {},
    darkMode: false,
    leftPaneOpen: true,
    rightPaneOpen: true,
    closeWhenSaveTab: false,
    githubConfig: {
        username: '',
        repo: '',
        pat: '',
        filepath: 'bookmarks.json'
    }
};

// Global settings object
let globalSettings = {
    pages: [
        {
            guid: 'default',
            name: 'Bookmarks',
            filepath: 'bookmarks.json',
            lastModified: Date.now()
        }
    ],
    activePage: 'default',
    wallpaper: '',
    darkMode: false,
    openInNewTab: false,
    closeWhenSaveTab: false,
    leftPaneOpen: true,
    rightPaneOpen: true,
    lastSynced: null
};

let draggedItem = null;
let placeholder = null;
let dropdown = null;

// Funktion för att validera GitHub-konfigurationen
function isGitHubConfigValid() {
    const { username, repo, pat } = bookmarkManagerData.githubConfig;
    return username && repo && pat;
}

// Funktion för att hämta data från GitHub via background.js
async function fetchFromGitHub(filepath) {
    try {
        const config = {
            ...bookmarkManagerData.githubConfig,
            filepath: filepath || bookmarkManagerData.githubConfig.filepath
        };
        
        const response = await chrome.runtime.sendMessage({
            action: 'fetchFromGitHub',
            config: config
        });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        return response.content;
    } catch (error) {
        console.error(`Error in fetchFromGitHub (${filepath}):`, error);
        throw error;
    }
}

// Funktion för att pusha till GitHub via background.js
async function pushToGitHub(content, filepath) {
    const config = {
        ...bookmarkManagerData.githubConfig,
        filepath: filepath || bookmarkManagerData.githubConfig.filepath
    };
    
    const response = await chrome.runtime.sendMessage({
        action: 'pushToGitHub',
        config: config,
        content: content
    });
    
    return response.success;
}

// Variabel för att spåra om synkronisering pågår
let isSyncing = false;

// Funktion för att synkronisera global settings
async function synchronizeGlobalSettings(retryCount = 0) {
    if (!isGitHubConfigValid()) {
        throw new Error('Please configure GitHub settings first');
    }

    const globalFilepath = '.globalTTN.json';
    
    try {
        // Försök hämta globala inställningar från GitHub
        const remoteGlobalSettings = await fetchFromGitHub(globalFilepath).catch(error => {
            if (error.message.includes('404') && retryCount === 0) {
                console.log('Creating initial global settings file');
                // Om filen inte finns, skapa med nuvarande inställningar
                return null;
            }
            throw error;
        });

        if (remoteGlobalSettings) {
            // Om fjärrinställningar finns, kontrollera vilken som är nyare
            const localUpdated = globalSettings.lastSynced || 0;
            const remoteUpdated = remoteGlobalSettings.lastSynced || 0;
            
            if (remoteUpdated > localUpdated) {
                // Remote är nyare, använd den men bevara aktiv sida
                const activePage = globalSettings.activePage;
                globalSettings = {
                    ...remoteGlobalSettings,
                    activePage: activePage
                };
                
                // Uppdatera UI baserat på inställningar
                applyGlobalSettings();
            }
        }
        
        // Uppdatera lastSynced och pusha till GitHub
        globalSettings.lastSynced = Date.now();
        
        await pushToGitHub(globalSettings, globalFilepath);
        
        // Uppdatera dropdown med pages
        if (dropdown) {
            const dropdownItems = globalSettings.pages.map(page => ({
                guid: page.guid,
                name: page.name,
                lastModified: page.lastModified
            }));
            
            dropdown.setItems(dropdownItems);
            
            const activePage = globalSettings.pages.find(p => p.guid === globalSettings.activePage);
            if (activePage) {
                dropdown.setActiveItem(activePage.guid);
            }
        }
        
        console.log('Global settings synchronized successfully');
        return true;
        
    } catch (error) {
        console.error('Failed to synchronize global settings:', error);
        if (retryCount < 2) {
            return synchronizeGlobalSettings(retryCount + 1);
        }
        throw error;
    }
}

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

// Uppdaterad funktion för att tillämpa globala inställningar
function applyGlobalSettings() {
    // Uppdatera UI baserat på globala inställningar
    document.getElementById('openInNewTab').checked = globalSettings.openInNewTab;
    document.getElementById('closeWhenSaveTab').checked = globalSettings.closeWhenSaveTab;
    document.getElementById('darkMode').checked = globalSettings.darkMode;
    
    // Uppdatera lokala variabler för att spegla globala inställningar
    bookmarkManagerData.openInNewTab = globalSettings.openInNewTab;
    bookmarkManagerData.closeWhenSaveTab = globalSettings.closeWhenSaveTab;
    bookmarkManagerData.darkMode = globalSettings.darkMode;
    bookmarkManagerData.leftPaneOpen = globalSettings.leftPaneOpen;
    bookmarkManagerData.rightPaneOpen = globalSettings.rightPaneOpen;
    
    // Tillämpa dark mode
    if (globalSettings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Tillämpa bakgrundsbild
    if (globalSettings.wallpaper) {
        setBackground(globalSettings.wallpaper);
    }
    
    // Tillämpa paneltillstånd
    if (!globalSettings.leftPaneOpen) {
        const leftPane = document.getElementById('leftPane');
        leftPane.classList.add('closed');
        leftPane.querySelector('#settings').classList.add('hidden');
    } else {
        const leftPane = document.getElementById('leftPane');
        leftPane.classList.remove('closed');
        leftPane.querySelector('#settings').classList.remove('hidden');
    }
    
    if (!globalSettings.rightPaneOpen) {
        const rightPane = document.getElementById('rightPane');
        rightPane.classList.add('closed');
        rightPane.querySelector('#content').classList.add('hidden');
    } else {
        const rightPane = document.getElementById('rightPane');
        rightPane.classList.remove('closed');
        rightPane.querySelector('#content').classList.remove('hidden');
    }
}

function setBackground(imageName) {
    if (!imageName || imageName === 'wp_none.png') {
        document.body.style.backgroundImage = 'none'; // Or document.body.style.backgroundImage = '';
    } else {
        document.body.style.backgroundImage = `url("large_${imageName}")`;
    }
    
    // Uppdatera global settings
    globalSettings.wallpaper = imageName;
    saveToLocalStorage();
}

// Funktion för att byta aktiv sida
async function switchPage(pageGuid) {
    if (isSyncing) {
        alert('Sync in progress. Please wait...');
        return;
    }
    
    if (!isGitHubConfigValid()) {
        alert('Please configure GitHub settings first');
        return;
    }
    
    const syncButton = document.getElementById('syncButton');
    syncButton.classList.add('syncing');
    isSyncing = true;
    
    try {
        // 1. Hitta nuvarande och ny sida
        const currentPage = globalSettings.pages.find(p => p.guid === globalSettings.activePage);
        const newPage = globalSettings.pages.find(p => p.guid === pageGuid);
        
        if (!newPage) {
            throw new Error('Selected page not found');
        }
        
        // 2. Synkronisera nuvarande sida innan byte        
        if (!currentPage) {
            throw new Error('Active page not found');
        }
        
        const filepath = currentPage.filepath;
        bookmarkManagerData.githubConfig.filepath = filepath;
        
        const [localData, rawRemoteData] = await Promise.all([
            loadFromLocalStorage(),
            fetchFromGitHub(filepath).catch(async error => {
                if (error.message.includes('404') && retryCount === 0) {
                    console.log('Creating initial remote file');
                    await pushToGitHub({
                        collections: bookmarkManagerData.collections,
                        lastModified: Date.now()
                    }, filepath);
                    return null;
                }
                throw error;
            })
        ]);

        const remoteData = rawRemoteData ? {
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            ...rawRemoteData
        } : null;

        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid remote data structure from GitHub');
        }

        const mergedCollections = mergeDatasets(
            (localData?.collections || []),
            (remoteData?.collections || [])
        );
        
        bookmarkManagerData.collections = mergedCollections;
        bookmarkManagerData.lastSynced = Date.now();

        await pushToGitHub({
            collections: bookmarkManagerData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            })),
            lastModified: Date.now()
        }, filepath);
        
        // 3. Uppdatera aktiv sida i globalSettings
        globalSettings.activePage = pageGuid;
        await synchronizeGlobalSettings();
        
        // 4. Rensa nuvarande collections
        bookmarkManagerData.collections = [];
        
        // 5. Uppdatera github filepath för aktuell page
        bookmarkManagerData.githubConfig.filepath = newPage.filepath;
        
        // 6. Hämta den nya sidans data
        try {
            const pageData = await fetchFromGitHub(newPage.filepath);
            if (pageData && pageData.collections) {
                // Ladda collections från den nya sidan
                bookmarkManagerData.collections = pageData.collections.map(enrichCollection);
            } else {
                // Om sidan inte har några sparade collections, skapa en tom standardsamling
                const defaultCollection = enrichCollection(createDefaultCollection());
                bookmarkManagerData.collections = [defaultCollection];
            }
        } catch (error) {
            console.error('Error loading page data:', error);
            // Om det inte finns någon sparad data, skapa standardsamling
            const defaultCollection = enrichCollection(createDefaultCollection());
            bookmarkManagerData.collections = [defaultCollection];
        }
        
        // 7. Rendera och spara lokal data
        renderCollections();
        saveToLocalStorage();
        
        console.log(`Switched to page: ${newPage.name}`);
        return true;
        
    } catch (error) {
        console.error('Failed to switch page:', error);
        alert(`Failed to switch page: ${error.message}`);
        return false;
    } finally {
        isSyncing = false;
        syncButton.classList.remove('syncing');
    }
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
            },
            {
                id: "1b82111d-5f1b-43d0-b188-a5cdaac95cef",
                title: "TheTab.Ninja Sourcecode",
                url: "https://github.com/sandeberger/TheTab.Ninja",
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

function launchAllTabs(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
      // Filtrera bort raderade bokmärken och samla URL:er
      const urls = collection.bookmarks
        .filter(bookmark => !bookmark.deleted)
        .map(bookmark => bookmark.url);
  
      // Öppna varje URL i en ny flik
      urls.forEach(url => {
        chrome.tabs.create({ url: url });
      });
    } else {
      console.error(`Collection med id ${collectionId} hittades inte.`);
    }
}

async function fetchAllTabs(collectionId) {
    try {
        // Hämta den fullständiga URL:en för bm.html (vår egen sida)
        const selfUrl = chrome.runtime.getURL("bm.html");
        chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
            if (response && response.length > 0) {
                let allTabs = [];
                response.forEach(windowData => {
                    allTabs = allTabs.concat(windowData.tabs);
                });
                const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
                if (!collection) {
                    console.error("Collection not found:", collectionId);
                    return;
                }
                allTabs.forEach(tab => {
                    // Hoppa över vår egen sida så vi inte stänger den
                    if (tab.url === selfUrl) return;
                    
                    const newBookmark = {
                        id: generateUUID(),
                        title: tab.title,
                        url: tab.url,
                        description: "",
                        icon: tab.favIconUrl || "default-icon.png",
                        lastModified: Date.now(),
                        deleted: false,
                        position: collection.bookmarks.length
                    };
                    collection.bookmarks.push(newBookmark);
                    // Stäng fliken om inställningen är aktiv, och om det inte är vår egen sida
                    if (bookmarkManagerData.closeWhenSaveTab && (tab.tabId || tab.id)) {
                        chrome.tabs.remove(tab.tabId || tab.id);
                    }
                });
                collection.lastModified = Date.now();
                renderCollections();
                saveToLocalStorage();
            }
        });
    } catch (error) {
        console.error("Error in fetchAllTabs:", error);
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

function createButton(className, text, tooltipText) {
    const button = document.createElement('button');
    button.className = `collection-button ${className}`;
    button.textContent = text;
    if (tooltipText) {
        button.title = tooltipText;
    }
    return button;
}

// Uppdaterad funktion för att skapa en ny sida
async function createNewPage(name) {
    if (!isGitHubConfigValid()) {
        alert('Please configure GitHub settings first');
        return null;
    }
    
    const syncButton = document.getElementById('syncButton');
    syncButton.classList.add('syncing');
    isSyncing = true;
    try {
        // 1. Generera ett nytt GUID för sidan och filnamnet
        const guid = generateUUID();
        const filepath = `${guid}.json`;
        
        // 2. Skapa ny sida med tom data
        const emptyPageData = {
            collections: [],
            lastModified: Date.now()
        };
        
        // 3. Pusha den tomma sidan till GitHub
        await pushToGitHub(emptyPageData, filepath);
        
        // 4. Lägg till sidan i globalSettings
        const newPage = {
            guid: guid,
            name: name,
            filepath: filepath,
            lastModified: Date.now()
        };
        
        globalSettings.pages.push(newPage);
        
        // 5. Uppdatera globalSettings på GitHub
        await synchronizeGlobalSettings();
        
        console.log(`Created new page: ${name}`);
        return newPage;
        
    } catch (error) {
        console.error('Failed to create new page:', error);
        alert(`Failed to create new page: ${error.message}`);
        return null;
    } finally {
        isSyncing = false;
        syncButton.classList.remove('syncing');
    }
}

// Uppdaterad funktion för att ta bort en sida
async function deletePage(pageGuid) {
    if (!isGitHubConfigValid()) {
        alert('Please configure GitHub settings first');
        return false;
    }
    
    // Förhindra borttagning av sista sidan
    if (globalSettings.pages.length <= 1) {
        alert('Cannot delete the last page. At least one page must exist.');
        return false;
    }
    
    try {
        // 1. Hitta sidan som ska tas bort
        const pageIndex = globalSettings.pages.findIndex(p => p.guid === pageGuid);
        if (pageIndex === -1) return false;
        
        const pageToDelete = globalSettings.pages[pageIndex];
        
        // 2. Ta bort sidan från globalSettings
        globalSettings.pages.splice(pageIndex, 1);
        
        // 3. Om den aktiva sidan tas bort, växla till den första i listan
        if (globalSettings.activePage === pageGuid) {
            globalSettings.activePage = globalSettings.pages[0].guid;
            await switchPage(globalSettings.activePage);
        }
        
        // 4. Uppdatera globalSettings på GitHub
        await synchronizeGlobalSettings();
        
        console.log(`Deleted page: ${pageToDelete.name}`);
        return true;
        
    } catch (error) {
        console.error('Failed to delete page:', error);
        alert(`Failed to delete page: ${error.message}`);
        return false;
    }
}

// Uppdaterad funktion för att redigera en sida
async function editPage(pageGuid, newName) {
    if (!isGitHubConfigValid()) {
        alert('Please configure GitHub settings first');
        return false;
    }
    
    try {
        // 1. Hitta sidan som ska redigeras
        const page = globalSettings.pages.find(p => p.guid === pageGuid);
        if (!page) return false;
        
        // 2. Uppdatera sidans namn
        page.name = newName;
        page.lastModified = Date.now();
        
        // 3. Uppdatera globalSettings på GitHub
        await synchronizeGlobalSettings();
        
        console.log(`Updated page name to: ${newName}`);
        return true;
        
    } catch (error) {
        console.error('Failed to update page:', error);
        alert(`Failed to update page: ${error.message}`);
        return false;
    }
}

// Uppdaterad huvudfunktion för synkronisering
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
        // Steg 1: Synkronisera globala inställningar först
        await synchronizeGlobalSettings();
        
        // Steg 2: Hämta aktuell page filepath från globalSettings
        const activePage = globalSettings.pages.find(p => p.guid === globalSettings.activePage);
        if (!activePage) {
            throw new Error('Active page not found');
        }
        
        const filepath = activePage.filepath;
        bookmarkManagerData.githubConfig.filepath = filepath;
        
        // Steg 3: Hämta data från både lokalt och GitHub
        const [localData, rawRemoteData] = await Promise.all([
            loadFromLocalStorage(),
            fetchFromGitHub(filepath).catch(async error => {
                if (error.message.includes('404') && retryCount === 0) {
                    console.log('Creating initial remote file');
                    await pushToGitHub({
                        collections: bookmarkManagerData.collections,
                        lastModified: Date.now()
                    }, filepath);
                    return null;
                }
                throw error;
            })
        ]);

        // Steg 4: Enricha remote-data
        const remoteData = rawRemoteData ? {
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            ...rawRemoteData
        } : null;

        // Steg 5: Validera datastrukturer
        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid remote data structure from GitHub');
        }

        // Steg 6: Merga collections
        const mergedCollections = mergeDatasets(
            (localData?.collections || []),
            (remoteData?.collections || [])
        );

        // Steg 7: Uppdatera lokalt tillstånd
        bookmarkManagerData.collections = mergedCollections;
        bookmarkManagerData.lastSynced = Date.now();

        // Steg 8: Pusha mergad data till GitHub (inkl. raderade)
        await pushToGitHub({
            collections: bookmarkManagerData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            })),
            lastModified: Date.now()
        }, filepath);

        // Steg 9: Uppdatera UI och lagring
        renderCollections();
        saveToLocalStorage();

        console.log('Synchronization completed successfully');

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

// Uppdaterad funktion för att spara till localStorage
function saveToLocalStorage() {
    try {
        // Spara bookmark data
        localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));
        
        // Spara global settings
        localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
        
        console.log('Saved data to localStorage');
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Uppdaterad funktion för att ladda från localStorage
function loadFromLocalStorage() {
    try {
        // Ladda bookmark data
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
                collections: [],  // Standard tom array
                openInNewTab: false,
                chromeWindowStates: {},
                darkMode: false,
                leftPaneOpen: true,
                rightPaneOpen: true,
                closeWhenSaveTab: false,
                githubConfig: {
                    ...bookmarkManagerData.githubConfig, // Behåll standard githubConfig
                    ...(parsedData.githubConfig || {}),  // Överskrid med sparade githubConfig värden
                    pat: existingPat || parsedData.githubConfig?.pat || '' // Behåll existerande PAT
                },
                ...parsedData  // Överskrid med sparade värden
            };
        } else {
            // Lägg till standardcollection vid första start
            const defaultCollection = enrichCollection(createDefaultCollection());
            bookmarkManagerData.collections.push(defaultCollection);
            saveToLocalStorage(); 
        }
        
        // Ladda globala inställningar
        const globalData = localStorage.getItem('globalSettings');
        if (globalData) {
            const parsedGlobalData = JSON.parse(globalData);
            globalSettings = {
                ...globalSettings, // Behåll standardvärden
                ...parsedGlobalData // Överskrid med sparade värden
            };
        }
        
        // Säkerställ att det finns minst en page
        if (!globalSettings.pages || globalSettings.pages.length === 0) {
            globalSettings.pages = [{
                guid: 'default',
                name: 'Bookmarks',
                filepath: 'bookmarks.json',
                lastModified: Date.now()
            }];
            globalSettings.activePage = 'default';
        }
        
        // Överför legacy-inställningar till globala inställningar
        /*if (bookmarkManagerData.darkMode !== undefined) {
            globalSettings.darkMode = bookmarkManagerData.darkMode;
        }
        if (bookmarkManagerData.openInNewTab !== undefined) {
            globalSettings.openInNewTab = bookmarkManagerData.openInNewTab;
        }
        if (bookmarkManagerData.closeWhenSaveTab !== undefined) {
            globalSettings.closeWhenSaveTab = bookmarkManagerData.closeWhenSaveTab;
        }
        if (bookmarkManagerData.leftPaneOpen !== undefined) {
            globalSettings.leftPaneOpen = bookmarkManagerData.leftPaneOpen;
        }
        if (bookmarkManagerData.rightPaneOpen !== undefined) {
            globalSettings.rightPaneOpen = bookmarkManagerData.rightPaneOpen;
        }*/
        
        // Tillämpa inställningar på UI
        applyGlobalSettings();
        
        // Verifiera att aktiv sida finns i pages
        const activePageExists = globalSettings.pages.some(p => p.guid === globalSettings.activePage);
        if (!activePageExists && globalSettings.pages.length > 0) {
            globalSettings.activePage = globalSettings.pages[0].guid;
        }
        
        console.log('Loaded data from localStorage');
        return parsedData || bookmarkManagerData;
    } catch (error) {
        console.error('Error loading from local storage:', error);
        // Vid fel, använd standardvärden
        return bookmarkManagerData;
    }
}

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

window.addEventListener('storage', (event) => {
    if (event.key === 'bookmarkManagerData') {
      // Läs in den nya datan från localStorage
      const newData = loadFromLocalStorage();
      bookmarkManagerData = newData;
      renderCollections();
    }
  });

// Initialiseringskod
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderCollections();
    fetchChromeTabs();
    setInterval(fetchChromeTabs, 5000);

    const manifestData = chrome.runtime.getManifest();
    const version = manifestData.version;
    const versionDisplay = document.getElementById('versionDisplay');
    versionDisplay.textContent = `TheTab.ninja version: ${version}`;
    
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

    // Setup dropdown för pager
    const container = document.getElementById('dropdownContainer');
    if (container) {
        dropdown = new DropdownMenu(container, {
            onCreate: async (item) => {
                console.log("Creating new page:", item);
                const newPage = await createNewPage(item.name);
                if (newPage) {
                    // Switch to the new page after creation
                    switchPage(newPage.guid);
                }
            },
            onDelete: async (item) => {
                console.log("Deleting page:", item);
                await deletePage(item.guid);
            },
            onEdit: async (item) => {
                console.log("Editing page:", item);
                await editPage(item.guid, item.name);
            },
            onSelect: async (item) => {
                console.log("Switching to page:", item);
                await switchPage(item.guid);
            },
            onButtonClick: () => {
                console.log("Sync button clicked");
                synchronizeWithGitHub();
            }
        });
        
        // Initialisera dropdown med pages från globalSettings
        if (globalSettings && globalSettings.pages) {
            const items = globalSettings.pages.map(page => ({
                guid: page.guid,
                name: page.name,
                lastModified: page.lastModified
            }));
            dropdown.setItems(items);
            
            // Sätt aktiv sida
            const activePage = globalSettings.pages.find(p => p.guid === globalSettings.activePage);
            if (activePage) {
                dropdown.setActiveItem(activePage.guid);
            }
        }
    }

    document.getElementById('toggleLeftPane').addEventListener('click', function () {
        togglePane('leftPane');
        globalSettings.leftPaneOpen = !document.getElementById('leftPane').classList.contains('closed');
        saveToLocalStorage();
    });
    
    document.getElementById('toggleRightPane').addEventListener('click', function () {
        togglePane('rightPane');
        globalSettings.rightPaneOpen = !document.getElementById('rightPane').classList.contains('closed');
        saveToLocalStorage();
    });

    // Funktion för att sätta bakgrundsbild


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

        // Markera som vald om det är den sparade bakgrunden eller globala inställningen
        const activeWallpaper = globalSettings.wallpaper || savedBackground;
        if (activeWallpaper === imageName) {
            selectThumbnail(thumbnailImg);
            setBackground(imageName); // Sätt bakgrundsbilden direkt vid start
        }

        thumbnailImg.addEventListener('click', () => {
            const imageName = thumbnailImg.dataset.imageName;
            setBackground(imageName);
            localStorage.setItem('backgroundImage', imageName);
            selectThumbnail(thumbnailImg); // Markera den klickade miniatyren som vald
        });

        if (backgroundThumbnailsContainer) {
            backgroundThumbnailsContainer.appendChild(thumbnailImg);
        }
    });

    // Om ingen sparad bakgrund, välj den första som standard och markera dess thumbnail
    if (!globalSettings.wallpaper && !savedBackground && backgroundImages.length > 0) {
        const defaultImageName = backgroundImages[0];
        if (backgroundThumbnailsContainer) {
            const defaultThumbnail = backgroundThumbnailsContainer.querySelector(`.background-thumbnail[data-image-name="${defaultImageName}"]`);
            if (defaultThumbnail) {
                selectThumbnail(defaultThumbnail);
                setBackground(defaultImageName);
                localStorage.setItem('backgroundImage', defaultImageName);
                globalSettings.wallpaper = defaultImageName;
            }
        }
    }

    document.getElementById('addCollection').addEventListener('click', addCollection);
    
    // Uppdaterade event listeners för att hantera globala inställningar
    document.getElementById('openInNewTab').addEventListener('change', (e) => {
        globalSettings.openInNewTab = e.target.checked;
        bookmarkManagerData.openInNewTab = e.target.checked;
        saveToLocalStorage();
    });

    document.getElementById('closeWhenSaveTab').addEventListener('change', (e) => {
        globalSettings.closeWhenSaveTab = e.target.checked;
        bookmarkManagerData.closeWhenSaveTab = e.target.checked;
        saveToLocalStorage();
    });

    // Uppdaterad dark mode event listener
    document.getElementById('darkMode').addEventListener('change', (e) => {
        globalSettings.darkMode = e.target.checked;
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

    // Funktion för att uppdatera sync-knappens synlighet
    function updateSyncButtonVisibility() {
        const syncButton = document.getElementById('syncButton');
        if (syncButton) {
            syncButton.style.display = isGitHubConfigValid() ? 'flex' : 'none';
        }
        
        // Uppdatera dropdown-menyn med sidor från globalSettings
        if (dropdown && isGitHubConfigValid()) {
            const items = globalSettings.pages.map(page => ({
                guid: page.guid,
                name: page.name,
                lastModified: page.lastModified
            }));
            dropdown.setItems(items);
            
            // Sätt aktiv sida
            const activePage = globalSettings.pages.find(p => p.guid === globalSettings.activePage);
            if (activePage) {
                dropdown.setActiveItem(activePage.guid);
            }
        }
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
    
    // Sätt up stöd för confetti-effekt för supportknappen
    const supportButton = document.getElementById('supportButton');
    let confettiTimeout;

    if (supportButton) {
        supportButton.addEventListener('mouseenter', function(e) {
            // Beräkna muspositionen som en normaliserad koordinat
            const origin = {
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight
            };

            confettiTimeout = setTimeout(() => {
                startConfetti({ particleCount: 100, duration: 3000, origin: origin });
            }, 1000);
        });

        supportButton.addEventListener('mouseleave', function() {
            clearTimeout(confettiTimeout);
        });
    }
});

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

function mergeProperty(current, incoming) {
    return current === incoming ? current : 
        (current || incoming);
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

const svgInbox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309.197 309.197" xml:space="preserve" style="width:1em;height:1em" fill="currentColor"><path d="M120.808 10.036h67.581v100.671h54.559l-88.351 100.88-88.351-100.882h54.562z"/><path d="M260.002 176.673v73.289H49.195v-73.289H0v122.488h309.197V176.673z"/></svg>`;
const svgOutbox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309.197 309.197" xml:space="preserve" style="width:1em;height:1em" fill="currentColor"><path d="M120.808 211.587h67.581V110.916h54.559l-88.351-100.88-88.351 100.882h54.562z"/><path d="M260.002 176.673v73.289H49.195v-73.289H0v122.488h309.197V176.673z"/></svg>`;

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
            { className: 'launch-collection', text: '🚀', title: 'Open all these webpages in a Chrome tab group', action: () => launchCollection(collection.id) },
            { className: 'openall-collection', icon: 'outbox', title: 'Open all webpages in this collection', action: () => launchAllTabs(collection.id) },
            { className: 'fetch-alltabs', icon: 'inbox', title: 'Get all Chrome tabs', action: () => fetchAllTabs(collection.id) },
            { className: 'add-bookmark', text: '+', title: 'Create bookmark', action: () => addBookmark(collection.id) },
            { className: 'edit-collection', text: '✏️', title: 'Edit collection', action: () => editCollection(collection.id) },
            { className: 'move-collection', text: '▲', title: 'Move collection up', action: () => moveCollection(collection.id, -1) },
            { className: 'move-collection', text: '▼', title: 'Move collection down', action: () => moveCollection(collection.id, 1) },
            { className: 'delete-collection', text: '🗑️', title: 'Delete collection', action: () => deleteCollection(collection.id) }
        ];

        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = `collection-button ${btnConfig.className}`;
            btn.title = btnConfig.title;
            btn.addEventListener('click', btnConfig.action);
          
            // Kolla om vi ska använda SVG i stället för text
            if (btnConfig.icon === 'inbox') {
              btn.innerHTML = svgInbox;
            } else if (btnConfig.icon === 'outbox') {
              btn.innerHTML = svgOutbox;
            } else {
              // Annars använd vanlig text
              btn.textContent = btnConfig.text;
            }
          
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

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Månader är 0-indexerade
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addCollection() {
    const today = new Date();
    const name = prompt('Enter collection name:',formatDate(today));
    if (name) {
        bookmarkManagerData.collections.forEach(c => {
            c.position++;
            c.lastModified = Date.now();
        });

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
        saveToLocalStorage();
    }
}

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

async function fetchChromeTabs() {
    try {
        chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = '';

            if (response && response.length > 0) {
                response.forEach((windowData) => {
                    const windowDiv = document.createElement('div');
                    windowDiv.className = 'window';

                    windowDiv.setAttribute('draggable', true);
                    windowDiv.addEventListener('dragstart', function(e) {
                        // Sätt draggedItem med typ "chromeWindow" och skicka med fönstrets data
                        draggedItem = {
                            type: 'chromeWindow',
                            data: windowData
                        };
                        e.dataTransfer.setData('text/plain', 'chromeWindow');
                    });

                    const windowTitle = document.createElement('div');
                    windowTitle.className = 'window-title';
                    windowTitle.textContent = `Chrome Window ID: ${windowData.windowId} (${windowData.tabs.length} tabs)`;

                    const tabsList = document.createElement('div');
                    tabsList.className = 'tabs-list';
                    const isOpen = (bookmarkManagerData.chromeWindowStates && bookmarkManagerData.chromeWindowStates[windowData.windowId]) !== false; // Standard: öppen
                    tabsList.style.display = isOpen ? 'block' : 'none';

                    const groups = windowData.groups || [];
                    const groupMap = {};
                    groups.forEach(group => {
                        groupMap[group.groupId] = group;
                    });

                    const groupedTabs = {};
                    const ungroupedTabs = [];

                    windowData.tabs.forEach(tab => {
                        if (tab.groupId && tab.groupId !== -1) {
                            if (!groupedTabs[tab.groupId]) {
                                groupedTabs[tab.groupId] = [];
                            }
                            groupedTabs[tab.groupId].push(tab);
                        } else {
                            ungroupedTabs.push(tab);
                        }
                    });

                    for (const groupId in groupedTabs) {
                        const groupTabs = groupedTabs[groupId];
                        const groupInfo = groupMap[groupId];

                        const groupContainer = document.createElement('div');
                        groupContainer.className = 'tab-group-container';
                        
                        const groupDragHandle = document.createElement('div');
                        groupDragHandle.className = 'group-drag-handle';
                        groupDragHandle.textContent = groupInfo && groupInfo.title ? groupInfo.title : 'Tab Group'; // Exempelikon
                        groupDragHandle.draggable = true;

                        groupDragHandle.addEventListener('dragstart', function(e) {
                            e.stopPropagation(); // Hindra att händelsen når underliggande element
                            draggedItem = {
                              type: 'chromeTabGroup',
                              data: {
                                title: groupInfo.title,
                                tabs: groupTabs
                              }
                            };
                            e.dataTransfer.effectAllowed = 'move';
                        });
                    
                        const groupHeader = document.createElement('div');
                        groupHeader.className = 'group-header';
                        groupHeader.appendChild(groupDragHandle);
                        

                        if (groupInfo && groupInfo.color) {
                            const colorMapping = {
                                'blue': 'rgba(66, 133, 244, 0.2)',
                                'red': 'rgba(219, 68, 55, 0.2)',
                                'yellow': 'rgba(244, 180, 0, 0.2)',
                                'green': 'rgba(15, 157, 88, 0.2)',
                                'pink': 'rgba(234, 67, 53, 0.2)',
                                'purple': 'rgba(155, 81, 224, 0.2)',
                                'cyan': 'rgba(0, 188, 212, 0.2)',
                                'orange': 'rgba(255, 152, 0, 0.2)'
                            };
                            const bgColor = colorMapping[groupInfo.color] || 'rgba(0,0,0,0.1)';
                            groupContainer.style.backgroundColor = bgColor;
                        } else {
                            groupContainer.style.backgroundColor = 'rgba(0,0,0,0.1)';
                        }

                        const groupTitle = document.createElement('div');
                        groupTitle.className = 'group-title';
                        //groupTitle.textContent = groupInfo && groupInfo.title ? groupInfo.title : 'Tab Group';
                        //groupContainer.draggable = true;
                        groupHeader.appendChild(groupTitle);
                        groupContainer.appendChild(groupHeader);
                        

                        const groupTabsContainer = document.createElement('div');
                        groupTabsContainer.className = 'group-tabs';

                        groupTabs.forEach(tabData => {
                            const tabDiv = createChromeTabElement({
                                id: tabData.tabId,
                                title: tabData.title,
                                url: tabData.url,
                                favIconUrl: tabData.favIconUrl
                            }, windowData.windowId);
                            groupTabsContainer.appendChild(tabDiv);
                        });

                        groupContainer.appendChild(groupTabsContainer);
                        tabsList.appendChild(groupContainer);

                        groupTitle.addEventListener('click', () => {
                            if (groupTabsContainer.style.display === 'none') {
                                groupTabsContainer.style.display = 'block';
                            } else {
                                groupTabsContainer.style.display = 'none';
                            }
                        });
                    }

                    ungroupedTabs.className = 'ungrouped-tabs';
                    ungroupedTabs.forEach(tabData => {
                        const tabDiv = createChromeTabElement({
                            id: tabData.tabId,
                            title: tabData.title,
                            url: tabData.url,
                            favIconUrl: tabData.favIconUrl
                        }, windowData.windowId);
                        tabsList.appendChild(tabDiv);
                    });

                    windowDiv.appendChild(windowTitle);
                    windowDiv.appendChild(tabsList);
                    contentDiv.appendChild(windowDiv);

                    windowTitle.addEventListener('click', () => {
                        const newState = tabsList.style.display === 'none' ? 'block' : 'none';
                        tabsList.style.display = newState;
                        bookmarkManagerData.chromeWindowStates[windowData.windowId] = newState === 'block';
                        saveToLocalStorage();
                    });
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

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
        e.stopPropagation();
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
        //if (!draggedItem) {
            chrome.runtime.sendMessage({
                action: 'switchToTab',
                tabId: tab.id,
                windowId: windowId
            });
        //}
    });

    return tabDiv;
}

// Hjälpfunktion för att generera unika ID:n
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

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
    if (draggedItem && 
        (draggedItem.type === 'bookmark' || 
         draggedItem.type === 'chromeTab' || 
         draggedItem.type === 'chromeWindow' || 
         draggedItem.type === 'chromeTabGroup')) {
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
    // Hämta vår egen sida för att kunna jämföra
    const selfUrl = chrome.runtime.getURL("bm.html");
    
    if (draggedItem) {
        const collectionElement = this.closest('.collection');
        const collectionId = collectionElement.dataset.collectionId;
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
        if (!collection) return;
        
        if (draggedItem.type === 'chromeTabGroup' || draggedItem.type === 'chromeWindow') {
            // Importera alla tabbar från gruppen som bokmärken
            let tabsArray = draggedItem.data.tabs || [];
            tabsArray.forEach(tab => {
                // Hoppa över om fliken är vår egen sida
                if (tab.url === selfUrl) return;
                const newBookmark = {
                    id: generateUUID(),
                    title: tab.title,
                    url: tab.url,
                    description: "",
                    icon: tab.favIconUrl || 'default-icon.png',
                    lastModified: Date.now(),
                    deleted: false,
                    position: collection.bookmarks.length
                };
                collection.bookmarks.push(newBookmark);
            });
            collection.lastModified = Date.now();
            // Stäng alla tabbar i gruppen om inställningen är aktiv och om de inte är vår egen sida
            if (bookmarkManagerData.closeWhenSaveTab && tabsArray) {
                tabsArray.forEach(tab => {
                    if ((tab.tabId || tab.id) && tab.url !== selfUrl) {
                        chrome.tabs.remove(tab.tabId || tab.id);
                    }
                });
            }
            renderCollections();
            saveToLocalStorage();
            draggedItem = null;
            return;
        }
        
        if (draggedItem.type === 'chromeTab') {
            // Om den enskilda tabben är vår egen sida, hoppa över att lägga till bokmärke och stängning
            if (draggedItem.data.url === selfUrl) {
                draggedItem = null;
                return;
            }
            const newBookmark = {
                id: generateUUID(),
                title: draggedItem.data.title,
                url: draggedItem.data.url,
                description: '',
                icon: draggedItem.data.icon || 'default-icon.png',
                lastModified: Date.now(),
                deleted: false,
                position: collection.bookmarks.length
            };
            collection.bookmarks.push(newBookmark);
            collection.lastModified = Date.now();
            // Stäng tabben om inställningen är aktiv och om den inte är vår egen sida
            if (bookmarkManagerData.closeWhenSaveTab &&
                (draggedItem.data.tabId || draggedItem.data.id) &&
                draggedItem.data.url !== selfUrl) {
                chrome.tabs.remove(draggedItem.data.tabId || draggedItem.data.id);
            }
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
        e.stopPropagation();
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
        //if (!draggedItem) {
            chrome.runtime.sendMessage({
                action: 'switchToTab',
                tabId: tab.id,
                windowId: windowId
            });
        //}
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

// Funktion som startar konfetti-animationen
function startConfetti(options = {}) {
    const { particleCount = 100, duration = 300, origin = { x: 0.5, y: 0.6 } } = options;
  
    // Skapa och konfigurera canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
  
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    // Skapa partiklar
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(origin, canvas.width, canvas.height));
    }
  
    let startTime = null;
  
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        // Beräkna en faktor som är hög i början (t.ex. 2) och minskar linjärt till 1 mot slutet.
        const maxFactor = 2; // Ändra detta värde för att starta ännu snabbare
        const factor = 1 + (maxFactor - 1) * (1 - elapsed / duration);
      
        // Uppdatera och rita varje partikel med den dynamiska faktorn
        particles.forEach(p => {
          p.x += p.vx * factor;
          p.y += p.vy * factor;
          p.vy += 0.05; // gravitation
          p.rotation += p.rotationSpeed;
          p.opacity = Math.max(0, p.opacity - 0.005);
      
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });
      
        if (elapsed < duration) {
          requestAnimationFrame(animate);
        } else {
          document.body.removeChild(canvas);
        }
    }
  
    requestAnimationFrame(animate);
  }
  
  // Hjälpfunktion för att skapa en partikel
  function createParticle(origin, width, height) {
    const x = origin.x * width;
    const y = origin.y * height;
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 4 + 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = Math.random() * 8 + 4;
    const colors = [
      { r: 239, g: 71, b: 111 }, // röd
      { r: 255, g: 209, b: 102 }, // gul
      { r: 6,   g: 214, b: 160 }, // grön
      { r: 17,  g: 138, b: 178 }  // blå
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
  
    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      size: size,
      rotation: Math.random() * 2 * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: color,
      opacity: 1
    };
  }
  
  // Använd event listeners på knappen
  const supportButton = document.getElementById('supportButton');
let confettiTimeout;

supportButton.addEventListener('mouseenter', function(e) {
  // Beräkna muspositionen som en normaliserad koordinat
  const origin = {
    x: e.clientX / window.innerWidth,
    y: e.clientY / window.innerHeight
  };

  confettiTimeout = setTimeout(() => {
    startConfetti({ particleCount: 100, duration: 3000, origin: origin });
  }, 1000);
});

supportButton.addEventListener('mouseleave', function() {
  clearTimeout(confettiTimeout);
});