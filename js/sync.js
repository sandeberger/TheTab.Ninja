/**
 * sync.js - Synchronization and merge logic
 * Handles fetching, pushing, merging data with GitHub and Google Drive.
 */

// Sync lock constants (cross-tab coordination via localStorage)
const SYNC_LOCK_KEY = 'tabNinjaSyncLock';
const SYNC_LOCK_DURATION = 30000; // 30 seconds

// Check if any sync provider is properly configured
function isSyncConfigValid() {
    const provider = bookmarkManagerData.syncProvider || 'none';
    if (provider === 'github') return isGitHubConfigValid();
    if (provider === 'googledrive') return isGoogleDriveConfigValid();
    if (provider === 'localdrive') return isLocalDriveConfigValid();
    return false;
}

// Validate GitHub configuration
function isGitHubConfigValid() {
    const { username, repo, pat, filepath } = bookmarkManagerData.githubConfig;
    if (!username || !repo || !pat) return false;
    const safePattern = /^[a-zA-Z0-9._-]+$/;
    if (!safePattern.test(username) || !safePattern.test(repo)) return false;
    if (filepath && !/^[a-zA-Z0-9._\-\/]+$/.test(filepath)) return false;
    return true;
}

// Validate Google Drive configuration
function isGoogleDriveConfigValid() {
    return bookmarkManagerData.googleDriveConfig &&
           bookmarkManagerData.googleDriveConfig.connected === true;
}

// Acquire cross-tab sync lock. Returns true if lock was acquired.
function acquireSyncLock() {
    const now = Date.now();
    const lockTime = parseInt(localStorage.getItem(SYNC_LOCK_KEY) || '0', 10);
    if (now - lockTime < SYNC_LOCK_DURATION) {
        return false; // Another tab holds the lock
    }
    localStorage.setItem(SYNC_LOCK_KEY, now.toString());
    return true;
}

// Release cross-tab sync lock
function releaseSyncLock() {
    localStorage.removeItem(SYNC_LOCK_KEY);
}

// Fetch data from GitHub via background.js
async function fetchFromGitHub() {
    try {
        const response = await sendMessageAsync({
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
    const response = await sendMessageAsync({
        action: 'pushToGitHub',
        config: bookmarkManagerData.githubConfig,
        content: content
    });
    if (response && response.error) {
        throw new Error(response.error);
    }
    return response && response.success;
}

// Sanitize data for sync (exclude secrets and provider-specific config)
function sanitizeDataForSync(data) {
    const sanitized = { ...data };

    if (sanitized.githubConfig) {
        sanitized.githubConfig = {
            ...sanitized.githubConfig,
            pat: undefined
        };
        delete sanitized.githubConfig.pat;
    }

    // Don't store Google Drive connection state in the synced file
    if (sanitized.googleDriveConfig) {
        sanitized.googleDriveConfig = {
            ...sanitized.googleDriveConfig,
            connected: undefined,
            fileId: undefined,
            userEmail: undefined
        };
        delete sanitized.googleDriveConfig.connected;
        delete sanitized.googleDriveConfig.fileId;
        delete sanitized.googleDriveConfig.userEmail;
    }

    // Don't store Local Drive connection state in the synced file
    if (sanitized.localDriveConfig) {
        sanitized.localDriveConfig = {
            ...sanitized.localDriveConfig,
            connected: undefined,
            folderName: undefined
        };
        delete sanitized.localDriveConfig.connected;
        delete sanitized.localDriveConfig.folderName;
    }

    // Don't store device-specific settings in the synced file
    delete sanitized.syncProvider;
    delete sanitized.autoSync;

    return sanitized;
}

// Merge scalar settings using settingsLastModified timestamp
function mergeSettings(localData, remoteData) {
    const localSettingsTime = localData.settingsLastModified || 0;
    const remoteSettingsTime = remoteData.settingsLastModified || 0;

    // Pick the more recently changed settings
    const useRemote = remoteSettingsTime > localSettingsTime;
    const source = useRemote ? remoteData : localData;

    return {
        openInNewTab: source.openInNewTab,
        closeWhenSaveTab: source.closeWhenSaveTab,
        darkMode: source.darkMode,
        zenMode: source.zenMode,
        hideCoffeeButton: source.hideCoffeeButton || false,
        collectionSortOrder: source.collectionSortOrder || 'userdefined',
        zenConfig: source.zenConfig || {},
        settingsLastModified: Math.max(localSettingsTime, remoteSettingsTime)
    };
}

// ============================================================
// Auto-Sync (debounced dirty flag)
// ============================================================

// Called whenever data changes to schedule an auto-sync
function markSyncDirty() {
    if (!bookmarkManagerData.autoSync?.enabled) return;
    if (!isSyncConfigValid()) return;
    if (isSyncing) return;

    // Skip if sync just completed (prevents loop from post-sync save)
    const lastSynced = bookmarkManagerData.lastSynced || 0;
    if (Date.now() - lastSynced < 3000) return;

    const delay = (bookmarkManagerData.autoSync.delaySeconds || 30) * 1000;

    // Clear existing timer (debounce)
    if (autoSyncTimer) {
        clearTimeout(autoSyncTimer);
    }

    // Update countdown indicator
    updateAutoSyncIndicator(true);

    autoSyncTimer = setTimeout(() => {
        autoSyncTimer = null;
        updateAutoSyncIndicator(false);
        synchronize();
    }, delay);
}

// Cancel any pending auto-sync (e.g. when user manually syncs)
function cancelAutoSync() {
    if (autoSyncTimer) {
        clearTimeout(autoSyncTimer);
        autoSyncTimer = null;
    }
    updateAutoSyncIndicator(false);
}

// Update the sync button to show pending auto-sync state
function updateAutoSyncIndicator(pending) {
    const syncButton = document.getElementById('syncButton');
    if (!syncButton) return;
    if (pending) {
        syncButton.classList.add('auto-sync-pending');
        syncButton.title = 'Auto-sync pending...';
    } else {
        syncButton.classList.remove('auto-sync-pending');
        syncButton.title = 'Sync your collections';
    }
}

// Host permissions needed per sync provider.
// Chrome grants host_permissions at install time, but Firefox MV3 treats them as
// opt-in, so we ask for them on the first user-initiated sync.
const PROVIDER_ORIGINS = {
    github: ['https://api.github.com/*', 'https://raw.githubusercontent.com/*'],
    googledrive: ['https://www.googleapis.com/*', 'https://accounts.google.com/*']
};

// Ensure host permissions are granted for the given provider.
// Returns true if granted (or not applicable). Never throws.
async function ensureHostPermissions(provider) {
    const origins = PROVIDER_ORIGINS[provider];
    if (!origins || !chrome.permissions) return true;
    try {
        const has = await new Promise(resolve =>
            chrome.permissions.contains({ origins }, granted => resolve(!!granted))
        );
        if (has) return true;
        // Requesting only works from a user gesture; auto-sync calls will fail
        // silently here and the user gets prompted on the next manual sync.
        return await new Promise(resolve =>
            chrome.permissions.request({ origins }, granted => {
                if (chrome.runtime.lastError) {
                    console.warn('Host permission request failed:', chrome.runtime.lastError.message);
                    resolve(false);
                } else {
                    resolve(!!granted);
                }
            })
        );
    } catch (e) {
        console.warn('Host permission check failed:', e);
        return false;
    }
}

// Unified sync dispatcher - routes to the correct provider
async function synchronize(retryCount = 0) {
    // Cancel any pending auto-sync when sync starts
    cancelAutoSync();

    const provider = bookmarkManagerData.syncProvider || 'none';
    await ensureHostPermissions(provider);
    if (provider === 'github') {
        return synchronizeWithGitHub(retryCount);
    } else if (provider === 'googledrive') {
        return synchronizeWithGoogleDrive(retryCount);
    } else if (provider === 'localdrive') {
        return synchronizeWithLocalDrive(retryCount);
    } else {
        alert('Please configure a sync provider in Settings.');
    }
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

    // Cross-tab lock
    if (!acquireSyncLock()) {
        console.log('Sync in progress on another tab');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton?.classList.add('syncing');
    isSyncing = true;

    try {
        // Fetch remote data (handle first-sync 404 without double push)
        let rawRemoteData;
        try {
            rawRemoteData = await fetchFromGitHub();
        } catch (error) {
            if (error.message.includes('404') && retryCount === 0) {
                // No remote file yet — push local data and finish
                console.log('Creating initial remote file');
                await pushToGitHub(sanitizeDataForSync(bookmarkManagerData));
                checkAndShowFirstSyncNotification();
                return;
            }
            throw error;
        }

        const localData = bookmarkManagerData;

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

        // Merge scalar settings by timestamp
        const mergedSettings = mergeSettings(localData, remoteData || {});

        const newData = {
            ...bookmarkManagerData,
            ...mergedSettings,
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

        // Apply merged settings to UI
        if (mergedSettings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        const darkModeEl = document.getElementById('darkMode');
        if (darkModeEl) darkModeEl.checked = mergedSettings.darkMode;
        const sortOrderEl = document.getElementById('collectionSortOrder');
        if (sortOrderEl) sortOrderEl.value = mergedSettings.collectionSortOrder;

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
            releaseSyncLock();
            await synchronizeWithGitHub(retryCount + 1);
        } else {
            alert(`Sync failed after ${retryCount + 1} attempts: ${error.message}`);
        }
    } finally {
        isSyncing = false;
        releaseSyncLock();
        syncButton?.classList.remove('syncing');
    }
}

// Merge datasets (collections) from local and remote
// Keeps soft-deleted bookmarks in data so deletions propagate across devices.
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

    // Normalize positions and sort (keep soft-deleted bookmarks for sync propagation)
    const result = Array.from(collectionMap.values());
    normalizePositions(result);
    result.forEach(collection => {
        collection.bookmarks.sort((a, b) => (a.position || 0) - (b.position || 0));
        // Re-assign sequential positions to avoid gaps/duplicates
        collection.bookmarks.forEach((b, i) => { b.position = i; });
    });
    return result;
}

// Normalize collection positions to sequential integers (0, 1, 2, ...)
function normalizePositions(collections) {
    // Sort non-deleted collections by position, then assign sequential positions
    const active = collections.filter(c => !c.deleted).sort((a, b) => (a.position || 0) - (b.position || 0));
    active.forEach((c, i) => { c.position = i; });
    // Deleted collections keep their position (irrelevant for display)
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

// ============================================================
// Google Drive Sync
// ============================================================

// localStorage key for the web-auth-flow token cache (Firefox path)
const GOOGLE_TOKEN_CACHE_KEY = 'googleDriveWebAuthToken';

// True when the browser supports chrome.identity.getAuthToken (Chrome).
// Firefox only implements launchWebAuthFlow.
function hasNativeGetAuthToken() {
    return !!(chrome.identity && typeof chrome.identity.getAuthToken === 'function');
}

// Get OAuth token. Uses chrome.identity.getAuthToken on Chrome and falls back
// to an implicit-grant flow via identity.launchWebAuthFlow on Firefox.
function getGoogleAuthToken(interactive = true) {
    if (hasNativeGetAuthToken()) {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(token);
                }
            });
        });
    }
    return getGoogleAuthTokenViaWebFlow(interactive);
}

// Firefox: OAuth implicit grant through identity.launchWebAuthFlow.
// Requires a "Web application" OAuth client in Google Cloud Console with
// the redirect URI from chrome.identity.getRedirectURL() registered
// (https://<extension-hash>.extensions.allizom.org/). The client_id is read
// from the oauth2 section of manifest.firefox.json.
async function getGoogleAuthTokenViaWebFlow(interactive) {
    // Reuse a cached, unexpired token first
    try {
        const cached = JSON.parse(localStorage.getItem(GOOGLE_TOKEN_CACHE_KEY) || 'null');
        if (cached && cached.token && cached.expiresAt > Date.now() + 60000) {
            return cached.token;
        }
    } catch (e) { /* corrupt cache - ignore */ }

    if (!interactive) {
        throw new Error('Not signed in to Google Drive. Open Settings and connect Google Drive again.');
    }

    const oauth2 = (chrome.runtime.getManifest().oauth2) || {};
    if (!oauth2.client_id) {
        throw new Error(
            'Google Drive sync is not configured for this Firefox build. ' +
            'Add a Web application OAuth client id to manifest.firefox.json (see FIREFOX.md), ' +
            'or use GitHub sync which works out of the box.'
        );
    }

    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
        '?client_id=' + encodeURIComponent(oauth2.client_id) +
        '&response_type=token' +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&scope=' + encodeURIComponent((oauth2.scopes || []).join(' ')) +
        '&prompt=select_account';

    const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (!url) {
                reject(new Error('Google sign-in was cancelled'));
            } else {
                resolve(url);
            }
        });
    });

    // Token arrives in the URL fragment: #access_token=...&expires_in=3599&...
    const fragment = new URLSearchParams(new URL(responseUrl).hash.substring(1));
    const token = fragment.get('access_token');
    const expiresIn = parseInt(fragment.get('expires_in') || '3600', 10);
    if (!token) {
        throw new Error('Google sign-in did not return an access token');
    }

    localStorage.setItem(GOOGLE_TOKEN_CACHE_KEY, JSON.stringify({
        token,
        expiresAt: Date.now() + expiresIn * 1000
    }));
    return token;
}

// Remove cached OAuth token (for disconnect or token refresh)
function removeCachedAuthToken(token) {
    if (hasNativeGetAuthToken()) {
        return new Promise((resolve) => {
            chrome.identity.removeCachedAuthToken({ token }, () => {
                resolve();
            });
        });
    }
    localStorage.removeItem(GOOGLE_TOKEN_CACHE_KEY);
    return Promise.resolve();
}

// Fetch data from Google Drive
async function fetchFromGoogleDrive() {
    const token = await getGoogleAuthToken(false);
    const config = bookmarkManagerData.googleDriveConfig;

    if (config.fileId) {
        // Try fetching by known file ID
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${config.fileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.ok) {
            return await response.json();
        }

        if (response.status === 404) {
            // File was deleted externally, clear fileId
            config.fileId = null;
            saveToLocalStorage();
        } else if (response.status === 401) {
            // Token expired, remove and retry
            await removeCachedAuthToken(token);
            throw new Error('Auth token expired. Please try syncing again.');
        } else {
            throw new Error(`Google Drive fetch failed: ${response.status} ${response.statusText}`);
        }
    }

    // Search for existing file by name
    const fileName = config.fileName || 'tabninja-bookmarks.json';
    const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id,name,modifiedTime)&spaces=drive`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!searchResponse.ok) {
        if (searchResponse.status === 401) {
            await removeCachedAuthToken(token);
            throw new Error('Auth token expired. Please try syncing again.');
        }
        throw new Error(`Google Drive search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
        // Found existing file, save its ID
        config.fileId = searchData.files[0].id;
        saveToLocalStorage();

        const fileResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${config.fileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (fileResponse.ok) {
            return await fileResponse.json();
        }
        throw new Error(`Google Drive file download failed: ${fileResponse.status}`);
    }

    // No file found
    return null;
}

// Push data to Google Drive
async function pushToGoogleDrive(content) {
    const token = await getGoogleAuthToken(false);
    const config = bookmarkManagerData.googleDriveConfig;
    const fileName = config.fileName || 'tabninja-bookmarks.json';
    const jsonContent = JSON.stringify(content, null, 2);

    if (config.fileId) {
        // Update existing file using multipart upload
        const metadata = { name: fileName, mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([jsonContent], { type: 'application/json' }));

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${config.fileId}?uploadType=multipart`,
            {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            }
        );

        if (response.ok) return true;

        if (response.status === 404) {
            // File was deleted externally, create new
            config.fileId = null;
        } else if (response.status === 401) {
            await removeCachedAuthToken(token);
            throw new Error('Auth token expired. Please try syncing again.');
        } else {
            throw new Error(`Google Drive update failed: ${response.status} ${response.statusText}`);
        }
    }

    // Create new file
    const metadata = { name: fileName, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const createResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form
        }
    );

    if (!createResponse.ok) {
        if (createResponse.status === 401) {
            await removeCachedAuthToken(token);
            throw new Error('Auth token expired. Please try syncing again.');
        }
        throw new Error(`Google Drive create failed: ${createResponse.status} ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    config.fileId = createData.id;
    saveToLocalStorage();
    return true;
}

// Connect to Google Drive
async function connectGoogleDrive() {
    try {
        await ensureHostPermissions('googledrive');
        const token = await getGoogleAuthToken(true);

        // Get user info for display
        const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        let email = '';
        if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            email = userInfo.email || '';
        }

        bookmarkManagerData.googleDriveConfig.connected = true;
        bookmarkManagerData.googleDriveConfig.userEmail = email;
        bookmarkManagerData.syncProvider = 'googledrive';
        saveToLocalStorage();

        updateGoogleDriveUI();
        updateSyncButtonVisibility();

        return true;
    } catch (error) {
        console.error('Google Drive connect error:', error);
        alert('Failed to connect to Google Drive: ' + error.message);
        return false;
    }
}

// Disconnect from Google Drive
async function disconnectGoogleDrive() {
    try {
        // Revoke the token
        const token = await getGoogleAuthToken(false).catch(() => null);
        if (token) {
            await removeCachedAuthToken(token);
            // Also revoke on Google's side
            fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
        }
    } catch (e) {
        // Ignore errors during token revocation
    }

    bookmarkManagerData.googleDriveConfig.connected = false;
    bookmarkManagerData.googleDriveConfig.fileId = null;
    bookmarkManagerData.googleDriveConfig.userEmail = '';
    bookmarkManagerData.syncProvider = 'none';
    saveToLocalStorage();

    updateGoogleDriveUI();
    updateSyncButtonVisibility();
}

// Update Google Drive UI state
function updateGoogleDriveUI() {
    const config = bookmarkManagerData.googleDriveConfig;
    const disconnected = document.getElementById('googleDriveDisconnected');
    const connected = document.getElementById('googleDriveConnected');
    const emailEl = document.getElementById('googleDriveEmail');
    const fileInfoEl = document.getElementById('googleDriveFileInfo');

    if (!disconnected || !connected) return;

    if (config.connected) {
        disconnected.style.display = 'none';
        connected.style.display = 'flex';
        if (emailEl) emailEl.textContent = config.userEmail || 'Connected';
        if (fileInfoEl) fileInfoEl.textContent = config.fileId
            ? `Syncing to: ${config.fileName || 'tabninja-bookmarks.json'}`
            : 'File will be created on first sync';
    } else {
        disconnected.style.display = 'flex';
        connected.style.display = 'none';
    }
}

// ============================================================
// Local Drive Sync (File System Access API + IndexedDB)
// ============================================================

// IndexedDB helpers for storing FileSystemDirectoryHandle
const LOCAL_DRIVE_DB_NAME = 'TabNinjaLocalDrive';
const LOCAL_DRIVE_STORE_NAME = 'handles';

function openLocalDriveDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(LOCAL_DRIVE_DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(LOCAL_DRIVE_STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function storeLocalDriveHandle(handle) {
    const db = await openLocalDriveDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_DRIVE_STORE_NAME, 'readwrite');
        tx.objectStore(LOCAL_DRIVE_STORE_NAME).put(handle, 'syncFolder');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getLocalDriveHandle() {
    const db = await openLocalDriveDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_DRIVE_STORE_NAME, 'readonly');
        const request = tx.objectStore(LOCAL_DRIVE_STORE_NAME).get('syncFolder');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function clearLocalDriveHandle() {
    const db = await openLocalDriveDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(LOCAL_DRIVE_STORE_NAME, 'readwrite');
        tx.objectStore(LOCAL_DRIVE_STORE_NAME).delete('syncFolder');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Ensure we have read/write permission on the stored handle
async function verifyLocalDrivePermission(handle) {
    const opts = { mode: 'readwrite' };
    if (await handle.queryPermission(opts) === 'granted') return true;
    if (await handle.requestPermission(opts) === 'granted') return true;
    return false;
}

// Validate Local Drive configuration
function isLocalDriveConfigValid() {
    return bookmarkManagerData.localDriveConfig &&
           bookmarkManagerData.localDriveConfig.connected === true;
}

// Fetch data from local file
async function fetchFromLocalDrive() {
    const handle = await getLocalDriveHandle();
    if (!handle) throw new Error('No folder selected. Please select a sync folder.');

    if (!await verifyLocalDrivePermission(handle)) {
        throw new Error('Permission denied. Please re-select the sync folder.');
    }

    const fileName = bookmarkManagerData.localDriveConfig.fileName || 'tabninja-bookmarks.json';

    try {
        const fileHandle = await handle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (e) {
        if (e.name === 'NotFoundError') {
            return null; // File doesn't exist yet
        }
        throw e;
    }
}

// Push data to local file
async function pushToLocalDrive(content) {
    const handle = await getLocalDriveHandle();
    if (!handle) throw new Error('No folder selected. Please select a sync folder.');

    if (!await verifyLocalDrivePermission(handle)) {
        throw new Error('Permission denied. Please re-select the sync folder.');
    }

    const fileName = bookmarkManagerData.localDriveConfig.fileName || 'tabninja-bookmarks.json';
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(content, null, 2));
    await writable.close();
    return true;
}

// Connect to local folder
async function connectLocalDrive() {
    try {
        if (!('showDirectoryPicker' in window)) {
            alert('Your browser does not support folder selection. Please use a Chromium-based browser.');
            return false;
        }

        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });

        await storeLocalDriveHandle(dirHandle);

        bookmarkManagerData.localDriveConfig.connected = true;
        bookmarkManagerData.localDriveConfig.folderName = dirHandle.name;
        bookmarkManagerData.syncProvider = 'localdrive';
        saveToLocalStorage();

        updateLocalDriveUI();
        updateSyncButtonVisibility();
        return true;
    } catch (error) {
        if (error.name === 'AbortError') return false; // User cancelled
        console.error('Local Drive connect error:', error);
        alert('Failed to select folder: ' + error.message);
        return false;
    }
}

// Change folder (re-select)
async function changeLocalDriveFolder() {
    try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await storeLocalDriveHandle(dirHandle);

        bookmarkManagerData.localDriveConfig.folderName = dirHandle.name;
        saveToLocalStorage();
        updateLocalDriveUI();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error changing folder:', error);
            alert('Failed to change folder: ' + error.message);
        }
    }
}

// Disconnect local drive
async function disconnectLocalDrive() {
    await clearLocalDriveHandle();

    bookmarkManagerData.localDriveConfig.connected = false;
    bookmarkManagerData.localDriveConfig.folderName = '';
    bookmarkManagerData.syncProvider = 'none';
    saveToLocalStorage();

    updateLocalDriveUI();
    updateSyncButtonVisibility();
}

// Update Local Drive UI state
function updateLocalDriveUI() {
    const config = bookmarkManagerData.localDriveConfig;
    const disconnected = document.getElementById('localDriveDisconnected');
    const connected = document.getElementById('localDriveConnected');
    const folderEl = document.getElementById('localDriveFolderName');
    const fileInfoEl = document.getElementById('localDriveFileInfo');

    if (!disconnected || !connected) return;

    if (config.connected) {
        disconnected.style.display = 'none';
        connected.style.display = 'flex';
        if (folderEl) folderEl.textContent = config.folderName || 'Selected folder';
        if (fileInfoEl) fileInfoEl.textContent = `File: ${config.fileName || 'tabninja-bookmarks.json'}`;
    } else {
        disconnected.style.display = 'flex';
        connected.style.display = 'none';
    }
}

// Local Drive synchronization
async function synchronizeWithLocalDrive(retryCount = 0) {
    if (!isLocalDriveConfigValid()) {
        alert('Please select a sync folder first');
        return;
    }

    if (isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    if (!acquireSyncLock()) {
        console.log('Sync in progress on another tab');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton?.classList.add('syncing');
    isSyncing = true;

    try {
        let rawRemoteData;
        try {
            rawRemoteData = await fetchFromLocalDrive();
        } catch (error) {
            if (error.message.includes('Permission denied') || error.message.includes('No folder selected')) {
                // Lost permission, mark as disconnected
                bookmarkManagerData.localDriveConfig.connected = false;
                saveToLocalStorage();
                updateLocalDriveUI();
                updateSyncButtonVisibility();
                alert(error.message);
                return;
            }
            throw error;
        }

        if (!rawRemoteData) {
            console.log('Creating initial local sync file');
            await pushToLocalDrive(sanitizeDataForSync(bookmarkManagerData));
            checkAndShowFirstSyncNotification();
            return;
        }

        const localData = bookmarkManagerData;

        const remoteData = (rawRemoteData && typeof rawRemoteData === 'object') ? {
            ...rawRemoteData,
            collections: Array.isArray(rawRemoteData.collections) ? rawRemoteData.collections.map(enrichCollection) : [],
            spaces: Array.isArray(rawRemoteData.spaces) ? rawRemoteData.spaces.map(enrichSpace) : []
        } : null;

        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid data in sync file');
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

        const mergedSettings = mergeSettings(localData, remoteData || {});

        const newData = {
            ...bookmarkManagerData,
            ...mergedSettings,
            collections: mergedCollections,
            spaces: mergedSpaces,
            currentSpace: mergedCurrentSpace,
            lastSynced: Date.now()
        };

        await pushToLocalDrive(sanitizeDataForSync({
            ...newData,
            collections: newData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            }))
        }));

        bookmarkManagerData = newData;

        if (mergedSettings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        const darkModeEl = document.getElementById('darkMode');
        if (darkModeEl) darkModeEl.checked = mergedSettings.darkMode;
        const sortOrderEl = document.getElementById('collectionSortOrder');
        if (sortOrderEl) sortOrderEl.value = mergedSettings.collectionSortOrder;

        renderCollections();
        renderSpaces();
        saveToLocalStorage();

        checkAndShowFirstSyncNotification();

    } catch (error) {
        console.error('Local Drive sync error:', error);
        if (retryCount < 1) {
            console.log(`Retrying Local Drive sync (attempt ${retryCount + 1})`);
            isSyncing = false;
            releaseSyncLock();
            await synchronizeWithLocalDrive(retryCount + 1);
        } else {
            alert(`Local Drive sync failed: ${error.message}`);
        }
    } finally {
        isSyncing = false;
        releaseSyncLock();
        syncButton?.classList.remove('syncing');
    }
}

// Google Drive synchronization
async function synchronizeWithGoogleDrive(retryCount = 0) {
    if (!isGoogleDriveConfigValid()) {
        alert('Please connect Google Drive first');
        return;
    }

    if (isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    if (!acquireSyncLock()) {
        console.log('Sync in progress on another tab');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton?.classList.add('syncing');
    isSyncing = true;

    try {
        let rawRemoteData;
        try {
            rawRemoteData = await fetchFromGoogleDrive();
        } catch (error) {
            if (error.message.includes('expired') && retryCount === 0) {
                // Token expired, retry once (getAuthToken will refresh)
                isSyncing = false;
                releaseSyncLock();
                return synchronizeWithGoogleDrive(retryCount + 1);
            }
            throw error;
        }

        if (!rawRemoteData) {
            // No remote file - push local data
            console.log('Creating initial Google Drive file');
            await pushToGoogleDrive(sanitizeDataForSync(bookmarkManagerData));
            checkAndShowFirstSyncNotification();
            return;
        }

        const localData = bookmarkManagerData;

        const remoteData = (rawRemoteData && typeof rawRemoteData === 'object') ? {
            ...rawRemoteData,
            collections: Array.isArray(rawRemoteData.collections) ? rawRemoteData.collections.map(enrichCollection) : [],
            spaces: Array.isArray(rawRemoteData.spaces) ? rawRemoteData.spaces.map(enrichSpace) : []
        } : null;

        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid remote data from Google Drive');
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

        const mergedSettings = mergeSettings(localData, remoteData || {});

        const newData = {
            ...bookmarkManagerData,
            ...mergedSettings,
            collections: mergedCollections,
            spaces: mergedSpaces,
            currentSpace: mergedCurrentSpace,
            lastSynced: Date.now()
        };

        await pushToGoogleDrive(sanitizeDataForSync({
            ...newData,
            collections: newData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            }))
        }));

        bookmarkManagerData = newData;

        if (mergedSettings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        const darkModeEl = document.getElementById('darkMode');
        if (darkModeEl) darkModeEl.checked = mergedSettings.darkMode;
        const sortOrderEl = document.getElementById('collectionSortOrder');
        if (sortOrderEl) sortOrderEl.value = mergedSettings.collectionSortOrder;

        renderCollections();
        renderSpaces();
        saveToLocalStorage();

        checkAndShowFirstSyncNotification();

    } catch (error) {
        console.error('Google Drive sync error:', error);
        if (retryCount < 2) {
            console.log(`Retrying Google Drive sync (attempt ${retryCount + 1})`);
            isSyncing = false;
            releaseSyncLock();
            await synchronizeWithGoogleDrive(retryCount + 1);
        } else {
            alert(`Google Drive sync failed after ${retryCount + 1} attempts: ${error.message}`);
        }
    } finally {
        isSyncing = false;
        releaseSyncLock();
        syncButton?.classList.remove('syncing');
    }
}
