/**
 * sync.js - GitHub synchronization and merge logic
 * Handles fetching, pushing, merging data with GitHub repository.
 */

// Validate GitHub configuration
function isGitHubConfigValid() {
    const { username, repo, pat, filepath } = bookmarkManagerData.githubConfig;
    if (!username || !repo || !pat) return false;
    const safePattern = /^[a-zA-Z0-9._-]+$/;
    if (!safePattern.test(username) || !safePattern.test(repo)) return false;
    if (filepath && !/^[a-zA-Z0-9._\-\/]+$/.test(filepath)) return false;
    return true;
}

// Fetch data from GitHub via background.js
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

// Push data to GitHub via background.js
async function pushToGitHub(content) {
    const response = await chrome.runtime.sendMessage({
        action: 'pushToGitHub',
        config: bookmarkManagerData.githubConfig,
        content: content
    });
    if (response && response.error) {
        throw new Error(response.error);
    }
    return response && response.success;
}

// Sanitize data for sync (exclude PAT)
function sanitizeDataForSync(data) {
    const sanitized = { ...data };

    if (sanitized.githubConfig) {
        sanitized.githubConfig = {
            ...sanitized.githubConfig,
            pat: undefined
        };
        delete sanitized.githubConfig.pat;
    }

    return sanitized;
}

// Main synchronization function
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
    syncButton?.classList.add('syncing');
    isSyncing = true;

    try {
        const [localData, rawRemoteData] = await Promise.all([
            loadFromLocalStorage(),
            fetchFromGitHub().catch(async error => {
                if (error.message.includes('404') && retryCount === 0) {
                    console.log('Creating initial remote file');
                    await pushToGitHub(sanitizeDataForSync(bookmarkManagerData));
                    return null;
                }
                throw error;
            })
        ]);

        const remoteData = (rawRemoteData && typeof rawRemoteData === 'object') ? {
            ...rawRemoteData,
            collections: Array.isArray(rawRemoteData.collections) ? rawRemoteData.collections.map(enrichCollection) : [],
            spaces: Array.isArray(rawRemoteData.spaces) ? rawRemoteData.spaces.map(enrichSpace) : []
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

        const localSpaces = (localData?.spaces || ['Everything']).map(enrichSpace);
        const remoteSpaces = remoteData?.spaces || [{ name: 'Everything', deleted: false, lastModified: Date.now() }];
        const mergedSpaces = mergeSpaces(localSpaces, remoteSpaces);

        const localCurrentSpace = localData?.currentSpace || 'Everything';
        const remoteCurrentSpace = remoteData?.currentSpace || 'Everything';
        let mergedCurrentSpace = localCurrentSpace;

        const spaceNames = mergedSpaces.filter(space => !space.deleted).map(space => space.name);
        if (!spaceNames.includes(localCurrentSpace)) {
            if (spaceNames.includes(remoteCurrentSpace)) {
                mergedCurrentSpace = remoteCurrentSpace;
            } else {
                mergedCurrentSpace = 'Everything';
            }
        }

        const newData = {
            ...bookmarkManagerData,
            collections: mergedCollections,
            spaces: mergedSpaces,
            currentSpace: mergedCurrentSpace,
            lastSynced: Date.now()
        };

        await pushToGitHub(sanitizeDataForSync({
            ...newData,
            collections: newData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            }))
        }));

        bookmarkManagerData = newData;
        renderCollections();
        renderSpaces();
        saveToLocalStorage();

        checkAndShowFirstSyncNotification();

    } catch (error) {
        console.error('Sync error:', error);
        const isConflict = error.message && (error.message.includes('409') || error.message.includes('422') || error.message.includes('not a fast-forward'));
        const maxRetries = isConflict ? 3 : 2;
        if (retryCount < maxRetries) {
            console.log(`Retrying sync (attempt ${retryCount + 1})${isConflict ? ' due to conflict' : ''}`);
            isSyncing = false;
            await synchronizeWithGitHub(retryCount + 1);
        } else {
            alert(`Sync failed after ${retryCount + 1} attempts: ${error.message}`);
        }
    } finally {
        isSyncing = false;
        syncButton?.classList.remove('syncing');
    }
}

// Merge datasets (collections) from local and remote
function mergeDatasets(localCollections, remoteCollections) {
    const allCollections = [...localCollections, ...remoteCollections];
    const collectionMap = new Map();
    const globalBookmarks = new Map();

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

    for (const collection of allCollections) {
        const existing = collectionMap.get(collection.id) || {
            ...collection,
            bookmarks: [],
            lastModified: 0
        };

        const shouldUseIncoming = collection.lastModified > existing.lastModified;
        collectionMap.set(collection.id, {
            ...existing,
            ...(shouldUseIncoming ? collection : {}),
            name: shouldUseIncoming ? collection.name : existing.name,
            spaces: shouldUseIncoming ? collection.spaces : existing.spaces,
            isOpen: shouldUseIncoming ? collection.isOpen : existing.isOpen,
            position: shouldUseIncoming ? collection.position : existing.position,
            deleted: shouldUseIncoming ? collection.deleted : existing.deleted,
            lastModified: Math.max(existing.lastModified, collection.lastModified),
            bookmarks: []
        });
    }

    globalBookmarks.forEach((bookmark, id) => {
        const collection = collectionMap.get(bookmark.parentCollection);
        if (collection) {
            collection.bookmarks.push(bookmark);
        }
    });

    return Array.from(collectionMap.values()).map(collection => ({
        ...collection,
        bookmarks: collection.bookmarks
            .filter(b => !b.deleted)
            .sort((a, b) => a.position - b.position)
    }));
}

// Merge spaces arrays
function mergeSpaces(localSpaces, remoteSpaces) {
    const normalizeSpaces = (spaces) => {
        if (!Array.isArray(spaces)) return [];
        return spaces.map(space => {
            if (typeof space === 'string') {
                return {
                    name: space,
                    deleted: false,
                    lastModified: Date.now()
                };
            }
            return space;
        });
    };

    const normalizedLocal = normalizeSpaces(localSpaces);
    const normalizedRemote = normalizeSpaces(remoteSpaces);

    const allSpaces = [...normalizedLocal, ...normalizedRemote];
    const spaceMap = new Map();

    for (const space of allSpaces) {
        const existing = spaceMap.get(space.name) || {
            name: space.name,
            deleted: false,
            lastModified: 0
        };

        const shouldUseIncoming = space.lastModified > existing.lastModified;
        spaceMap.set(space.name, {
            name: shouldUseIncoming ? space.name : existing.name,
            deleted: shouldUseIncoming ? space.deleted : existing.deleted,
            lastModified: Math.max(existing.lastModified, space.lastModified)
        });
    }

    const mergedSpaces = Array.from(spaceMap.values());

    let everythingSpace = mergedSpaces.find(s => s.name === 'Everything');
    if (!everythingSpace) {
        everythingSpace = {
            name: 'Everything',
            deleted: false,
            lastModified: Date.now()
        };
        mergedSpaces.push(everythingSpace);
    } else {
        everythingSpace.deleted = false;
    }

    return mergedSpaces;
}

// First Sync Success Notification Functions
function checkAndShowFirstSyncNotification() {
    const hasShownFirstSync = localStorage.getItem('hasShownFirstSyncNotification');

    if (!hasShownFirstSync) {
        localStorage.setItem('hasShownFirstSyncNotification', 'true');

        setTimeout(() => {
            showFirstSyncNotification();
        }, 1000);
    }
}

function showFirstSyncNotification() {
    const notification = document.getElementById('firstSyncNotification');
    if (!notification) return;

    notification.classList.add('show');

    const handleClick = () => {
        hideFirstSyncNotification();
        notification.removeEventListener('click', handleClick);
    };
    notification.addEventListener('click', handleClick);

    setTimeout(() => {
        hideFirstSyncNotification();
        notification.removeEventListener('click', handleClick);
    }, 10000);
}

function hideFirstSyncNotification() {
    const notification = document.getElementById('firstSyncNotification');
    if (!notification) return;

    notification.classList.remove('show');
}
