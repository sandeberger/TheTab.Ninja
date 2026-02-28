/**
 * data.js - Data management, enrichment, import/export, and localStorage
 * Handles data structure integrity, persistence, and migration.
 */

// Helper function to enrich a single bookmark
function enrichBookmark(bookmark) {
    return {
        ...bookmark,
        parentCollection: bookmark.parentCollection || null,
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
        spaces: ['Everything'],
        ...collection,
        lastModified: collection.lastModified && Number(collection.lastModified) ? Number(collection.lastModified) : Date.now(),
        bookmarks: (collection.bookmarks || []).map(enrichBookmark),
        spaces: Array.isArray(collection.spaces) && collection.spaces.length > 0
            ? collection.spaces
            : ['Everything']
    };
}

// Helper function to enrich a single space
function enrichSpace(space) {
    if (!space) {
        return { name: 'Unnamed Space', deleted: false, lastModified: Date.now() };
    }
    if (typeof space === 'string') {
        return {
            name: space,
            deleted: false,
            lastModified: Date.now()
        };
    }

    return {
        name: space.name || 'Unnamed Space',
        deleted: space.deleted || false,
        lastModified: space.lastModified && Number(space.lastModified) ? Number(space.lastModified) : Date.now()
    };
}

// Validate data structure for sync
function validateDataStructure(data) {
    if (!data) return false;
    if (!data.collections) return true;
    if (!Array.isArray(data.collections)) return false;
    // Fix collections that are missing required fields
    data.collections.forEach(c => {
        if (typeof c.id !== 'string') c.id = generateUUID();
        if (!Array.isArray(c.bookmarks)) c.bookmarks = [];
    });
    return true;
}

// Create collection from Chrome tab group data
function createCollectionFromTabGroup(tabGroupData) {
    const selfUrl = chrome.runtime.getURL("bm.html");

    if (!tabGroupData) {
        throw new Error('No tab group data provided');
    }

    let baseName;
    if (tabGroupData.title && tabGroupData.title.trim() !== '') {
        baseName = tabGroupData.title;
    } else if (tabGroupData.windowId) {
        baseName = generateWindowName(tabGroupData.windowId);
    } else {
        baseName = 'Tab Group';
    }
    const collectionName = generateUniqueCollectionName(baseName);

    const bookmarks = [];
    if (tabGroupData.tabs && Array.isArray(tabGroupData.tabs)) {
        let position = 0;
        tabGroupData.tabs.forEach((tab) => {
            if (tab.url === selfUrl || !tab.url || tab.url.startsWith('chrome://')) return;

            const newBookmark = {
                id: generateUUID(),
                title: tab.title || 'Untitled',
                url: tab.url,
                description: "",
                icon: tab.favIconUrl || 'assets/icons/default-icon.png',
                lastModified: Date.now(),
                deleted: false,
                position: position++
            };
            bookmarks.push(newBookmark);
        });
    }

    if (bookmarks.length === 0) {
        console.warn('No valid tabs found in tab group, creating empty collection');
    }

    const newCollection = {
        id: generateUUID(),
        name: collectionName,
        isOpen: true,
        lastModified: Date.now(),
        deleted: false,
        position: bookmarkManagerData.collections.length,
        bookmarks: bookmarks
    };

    bookmarkManagerData.collections.push(newCollection);

    if (bookmarkManagerData.closeWhenSaveTab && tabGroupData.tabs) {
        tabGroupData.tabs.forEach(tab => {
            if ((tab.tabId || tab.id) && tab.url !== selfUrl && tab.url && !tab.url.startsWith('chrome://')) {
                chrome.tabs.remove(tab.tabId || tab.id).catch(error => {
                    console.warn('Could not close tab:', error);
                });
            }
        });
    }

    return newCollection;
}

// Export bookmarks as JSON file
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

// Delete all collections and reset to default
function deleteAllCollections() {
    if (confirm('Are you sure you want to reset ALL collections to default? This cannot be undone.')) {
        const defaultCollection = enrichCollection(createDefaultCollection());
        bookmarkManagerData.collections = [defaultCollection];
        saveToLocalStorage();
        renderCollections();
        alert('All collections have been reset to default.');
    }
}

// Import bookmarks from JSON file
function importBookmarksFromFile(file) {
    // Reject files larger than 50MB to prevent browser freezing
    if (file.size > 50 * 1024 * 1024) {
        alert('File is too large to import (max 50MB).');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData || !Array.isArray(importedData.collections)) {
                throw new Error('Invalid file format: Missing collections array');
            }

            const enrichedCollections = importedData.collections.map(enrichCollection);

            if (!confirm('This will REPLACE all existing collections with the imported data. This cannot be undone. Continue?')) {
                return;
            }

            bookmarkManagerData.collections = enrichedCollections;

            // Import spaces if present in the file
            if (Array.isArray(importedData.spaces) && importedData.spaces.length > 0) {
                bookmarkManagerData.spaces = importedData.spaces.map(enrichSpace);
            }

            // Ensure all spaces referenced by collections exist
            const existingSpaceNames = new Set(
                bookmarkManagerData.spaces.map(s => typeof s === 'string' ? s : s.name)
            );
            for (const col of enrichedCollections) {
                if (Array.isArray(col.spaces)) {
                    for (const spaceName of col.spaces) {
                        if (!existingSpaceNames.has(spaceName)) {
                            bookmarkManagerData.spaces.push({
                                name: spaceName,
                                deleted: false,
                                lastModified: Date.now()
                            });
                            existingSpaceNames.add(spaceName);
                        }
                    }
                }
            }

            migrateSpacesToObjectFormat();
            initializeSpaces();
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

// Import bookmarks from Toby format
async function importTobyBookmarks() {
    const fileInput = document.getElementById('importTobyFile');
    const file = fileInput.files[0];

    if (file) {
        // Reject files larger than 50MB to prevent browser freezing
        if (file.size > 50 * 1024 * 1024) {
            alert('File is too large to import (max 50MB).');
            return;
        }
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const importedData = JSON.parse(e.target.result);
                let listsToImport = [];

                if (importedData.version === 3 && Array.isArray(importedData.lists)) {
                    listsToImport = importedData.lists;
                    console.log("Importing Toby v3 format");
                } else if (importedData.version === 4 && Array.isArray(importedData.groups)) {
                    importedData.groups.forEach(group => {
                        if (Array.isArray(group.lists)) {
                            listsToImport = listsToImport.concat(group.lists);
                        }
                    });
                    console.log("Importing Toby v4 format");
                } else {
                    throw new Error('Unsupported file format or version. Expected Toby v3 or v4.');
                }

                if (listsToImport.length === 0 && importedData.version === 4) {
                    console.warn("No lists found to import from Toby v4 file.");
                }

                if (listsToImport.length === 0) {
                    alert('No bookmark lists found in the imported file.');
                    return;
                }

                const newCollections = await Promise.all(listsToImport.map(async list => {
                    if (typeof list !== 'object' || list === null || typeof list.title === 'undefined') {
                        console.warn('Skipping invalid list item:', list);
                        return null;
                    }

                    const newCollection = enrichCollection({
                        name: list.title,
                        isOpen: true,
                        bookmarks: []
                    });

                    if (Array.isArray(list.cards)) {
                        newCollection.bookmarks = await Promise.all(list.cards.map(async card => {
                            if (typeof card !== 'object' || card === null) {
                                console.warn('Skipping invalid card item:', card);
                                return null;
                            }
                            return enrichBookmark({
                                title: card.customTitle || card.title || 'Untitled Bookmark',
                                url: card.url || '#',
                                description: card.customDescription || card.description || '',
                                icon: card.favIconUrl || (card.url ? await getFavicon(card.url) : 'assets/icons/default-icon.png')
                            });
                        }));
                        newCollection.bookmarks = newCollection.bookmarks.filter(b => b !== null);
                    }
                    return newCollection;
                }));

                const validNewCollections = newCollections.filter(c => c !== null);

                if (validNewCollections.length > 0) {
                    bookmarkManagerData.collections = [
                        ...bookmarkManagerData.collections,
                        ...validNewCollections
                    ];

                    renderCollections();
                    saveToLocalStorage();
                    alert('Bookmarks imported successfully!');
                } else if (listsToImport.length > 0) {
                    alert('Bookmarks imported, but some items might have been invalid and were skipped.');
                } else {
                    alert('No valid bookmarks found to import.');
                }

            } catch (error) {
                console.error('Error importing bookmarks:', error);
                alert('Error importing bookmarks. Please check the file format. Details: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

// Immediate save implementation (used by debounced wrapper and flush)
function _saveToLocalStorageImmediate() {
    try {
        localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));
    } catch (error) {
        console.error('Error saving to local storage:', error);
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            alert('Storage is full. Please remove some data (custom backgrounds, old collections) to continue saving.');
        }
    }
    // Also mirror to chrome.storage.local so the background service worker can access data
    try {
        if (chrome?.storage?.local) {
            chrome.storage.local.set({ bookmarkManagerData });
        }
    } catch (e) {
        // Silently ignore - chrome.storage may not be available in all contexts
    }
    // Trigger auto-sync debounce (skipped during active sync via isSyncing check)
    if (typeof markSyncDirty === 'function') {
        markSyncDirty();
    }
}

// Debounced save: batches rapid calls within a 250ms window
const saveToLocalStorage = debounce(_saveToLocalStorageImmediate, 250);

// Flush: forces an immediate save (use before sync, export, or page unload)
function flushSaveToLocalStorage() {
    saveToLocalStorage.cancel();
    _saveToLocalStorageImmediate();
}

// Load data from localStorage
function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('bookmarkManagerData');
        let parsedData = null;

        if (data) {
            parsedData = JSON.parse(data);

            if (Array.isArray(parsedData.collections)) {
                parsedData.collections = parsedData.collections.map(enrichCollection);
                // Favicon cleanup is handled by forceCleanupAllFaviconUrls() in init.js
            }

            const existingPat = bookmarkManagerData.githubConfig?.pat;
            const existingGDriveConfig = bookmarkManagerData.googleDriveConfig;

            bookmarkManagerData = {
                ...bookmarkManagerData,
                ...parsedData,
                githubConfig: {
                    ...bookmarkManagerData.githubConfig,
                    ...(parsedData.githubConfig || {}),
                    pat: existingPat || parsedData.githubConfig?.pat || ''
                },
                googleDriveConfig: {
                    ...existingGDriveConfig,
                    ...(parsedData.googleDriveConfig || {})
                },
                localDriveConfig: {
                    ...bookmarkManagerData.localDriveConfig,
                    ...(parsedData.localDriveConfig || {})
                },
                syncProvider: parsedData.syncProvider || bookmarkManagerData.syncProvider || 'none',
                zenConfig: {
                    ...bookmarkManagerData.zenConfig,
                    ...(parsedData.zenConfig || {})
                }
            };

            // Backward compatibility: auto-detect GitHub if configured but no syncProvider set
            if (!parsedData.syncProvider && bookmarkManagerData.syncProvider === 'none') {
                const gc = bookmarkManagerData.githubConfig;
                if (gc && gc.username && gc.repo && gc.pat) {
                    bookmarkManagerData.syncProvider = 'github';
                }
            }

            bookmarkManagerData.leftPaneOpen = parsedData.leftPaneOpen !== undefined ? parsedData.leftPaneOpen : true;
            bookmarkManagerData.rightPaneOpen = parsedData.rightPaneOpen !== undefined ? parsedData.rightPaneOpen : true;
        } else {
            const defaultCollection = enrichCollection(createDefaultCollection());
            bookmarkManagerData.collections.push(defaultCollection);
            saveToLocalStorage();
        }

        const openInNewTabEl = document.getElementById('openInNewTab');
        if (openInNewTabEl) openInNewTabEl.checked = bookmarkManagerData.openInNewTab;
        const closeWhenSaveTabEl = document.getElementById('closeWhenSaveTab');
        if (closeWhenSaveTabEl) closeWhenSaveTabEl.checked = bookmarkManagerData.closeWhenSaveTab;
        const darkModeEl = document.getElementById('darkMode');
        if (darkModeEl) darkModeEl.checked = bookmarkManagerData.darkMode;
        const sortOrderEl = document.getElementById('collectionSortOrder');
        if (sortOrderEl) sortOrderEl.value = bookmarkManagerData.collectionSortOrder || 'userdefined';

        const autoShowLeftEl = document.getElementById('autoShowLeftPane');
        if (autoShowLeftEl) autoShowLeftEl.checked = !!bookmarkManagerData.autoShowLeftPane;
        const autoShowRightEl = document.getElementById('autoShowRightPane');
        if (autoShowRightEl) autoShowRightEl.checked = !!bookmarkManagerData.autoShowRightPane;

        if (bookmarkManagerData.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        if (typeof applyPaneStates === 'function') {
            applyPaneStates();
        }
        console.log('Loaded data from localStorage');
        return parsedData || bookmarkManagerData;
    } catch (error) {
        console.error('Error loading from local storage:', error);
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

// Create default collection for first-time users
function createDefaultCollection() {
    return {
        name: "Kodar.Ninja",
        isOpen: true,
        bookmarks: [
            {
                title: "TheFile.Ninja",
                url: "https://thefile.ninja/",
                description: "A fast file manager powered by Everything search and AI. Find any file instantly, automate tasks with ai-actions, and let AI help you organize your digital chaos.",
                icon: "https://thefile.ninja/favicon.ico",
                id: "2b9eea23-644a-4def-b94a-b4fc8fc6cddb",
                deleted: false,
                lastModified: 1737456756973,
                position: 0
            },
            {
                title: "AquaZens",
                url: "https://aquazens.com/",
                description: "Snap a photo of your test strip. Get instant, AI-powered water analysis with clear dosing instructions for your pool or spa.",
                icon: "https://aquazens.com/favicon.ico",
                id: "a3f1c8d2-7b4e-4a91-9c56-8d2e1f3a5b7c",
                deleted: false,
                lastModified: 1737456756973,
                position: 1
            },
            {
                title: "Labs.Kodar.Ninja",
                url: "https://labs.kodar.ninja/",
                description: "All my projects and experiments at one place.",
                icon: "https://thefile.ninja/favicon.ico",
                id: "2b9eea24-144a-4dff-b94a-b4fc8fc6cddb",
                deleted: false,
                lastModified: 1737456756973,
                position: 2
            }
        ],
        id: "b7fea125-d5be-4068-84a5-040f57c70637",
        deleted: false,
        lastModified: 1737525179502,
        position: 0
    };
}

// Migration function to convert spaces from string array to object array
function migrateSpacesToObjectFormat() {
    if (!Array.isArray(bookmarkManagerData.spaces)) {
        bookmarkManagerData.spaces = ['Everything'];
    }

    const needsMigration = bookmarkManagerData.spaces.some(space => typeof space === 'string');
    if (needsMigration) {
        bookmarkManagerData.spaces = bookmarkManagerData.spaces.map(space => {
            if (typeof space === 'string') {
                return {
                    name: space,
                    deleted: false,
                    lastModified: Date.now()
                };
            }
            return space;
        });
    }
}

// Flush pending saves before page unload
window.addEventListener('beforeunload', flushSaveToLocalStorage);

// Listen for storage changes from other tabs/windows
window.addEventListener('storage', (event) => {
    if (event.key === 'bookmarkManagerData') {
        const newData = loadFromLocalStorage();
        bookmarkManagerData = newData;
        renderCollections();
    }
});
