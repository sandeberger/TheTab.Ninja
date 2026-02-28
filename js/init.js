/**
 * init.js - Initialization and event listener registration
 * Single DOMContentLoaded entry point. Event-driven Chrome tab updates.
 */

// Ensure activeLeftTab exists
if (!bookmarkManagerData.activeLeftTab) {
    bookmarkManagerData.activeLeftTab = 'spaces';
}

// Left pane tabs functionality
function initializeLeftPaneTabs() {
    if (bookmarkManagerData.activeLeftTab) {
        switchLeftTab(bookmarkManagerData.activeLeftTab);
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchLeftTab(tabName);
        });
    });
}

function switchLeftTab(tabName) {
    const validTabs = ['spaces', 'settings'];
    if (!validTabs.includes(tabName)) tabName = 'spaces';

    bookmarkManagerData.activeLeftTab = tabName;
    saveToLocalStorage();

    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    const tabPane = document.getElementById(`${tabName}-tab`);
    if (tabButton) tabButton.classList.add('active');
    if (tabPane) tabPane.classList.add('active');
}

// Helper: Update sync button visibility
function updateSyncButtonVisibility() {
    const syncButton = document.getElementById('syncButton');
    syncButton.style.display = isSyncConfigValid() ? 'flex' : 'none';
}

// Helper: Show/hide sync provider settings panels
function updateSyncProviderUI() {
    const provider = bookmarkManagerData.syncProvider || 'none';
    const githubSettings = document.getElementById('githubSyncSettings');
    const gdriveSettings = document.getElementById('googleDriveSyncSettings');
    const providerSelect = document.getElementById('syncProvider');

    if (providerSelect) providerSelect.value = provider;
    const localdriveSettings = document.getElementById('localDriveSyncSettings');

    if (githubSettings) githubSettings.style.display = provider === 'github' ? 'block' : 'none';
    if (gdriveSettings) gdriveSettings.style.display = provider === 'googledrive' ? 'block' : 'none';
    if (localdriveSettings) localdriveSettings.style.display = provider === 'localdrive' ? 'block' : 'none';

    if (provider === 'googledrive' && typeof updateGoogleDriveUI === 'function') {
        updateGoogleDriveUI();
    }
    if (provider === 'localdrive' && typeof updateLocalDriveUI === 'function') {
        updateLocalDriveUI();
    }

    // Show auto-sync settings only when a provider is configured
    const autoSyncSettings = document.getElementById('autoSyncSettings');
    if (autoSyncSettings) {
        autoSyncSettings.style.display = provider !== 'none' ? 'block' : 'none';
    }
}

// Helper: Show/hide auto-sync delay dropdown
function updateAutoSyncDelayVisibility() {
    const delaySection = document.getElementById('autoSyncDelaySection');
    if (delaySection) {
        delaySection.style.display = bookmarkManagerData.autoSync?.enabled ? 'block' : 'none';
    }
}

// Helper: Show/hide zen mode sub-settings
function updateZenSettingsVisibility() {
    const zenModeSettings = document.getElementById('zenModeSettings');
    if (zenModeSettings) {
        zenModeSettings.style.display = bookmarkManagerData.zenMode ? 'block' : 'none';
    }
}

// Helper: Restore zen settings UI controls from data
function loadZenSettingsUI() {
    const config = bookmarkManagerData.zenConfig || {};
    const greetingEnabled = document.getElementById('zenGreetingEnabled');
    const greetingLocale = document.getElementById('zenGreetingLocale');
    const clockFormat = document.getElementById('zenClockFormat');
    const showSeconds = document.getElementById('zenShowSeconds');
    const clockStyle = document.getElementById('zenClockStyle');
    const clockFont = document.getElementById('zenClockFont');
    const ambientAnimation = document.getElementById('zenAmbientAnimation');

    if (greetingEnabled) greetingEnabled.checked = config.greetingEnabled !== false;
    if (greetingLocale) greetingLocale.value = config.greetingLocale || 'auto';
    if (clockFormat) clockFormat.value = config.clockFormat || '24h';
    if (showSeconds) showSeconds.checked = !!config.showSeconds;
    if (clockStyle) clockStyle.value = config.clockStyle || 'digital';
    if (clockFont) clockFont.value = config.clockFont || 'system';
    if (ambientAnimation) ambientAnimation.value = config.ambientAnimation || 'none';
}

// Helper: Update backup settings visibility
function updateBackupSettingsVisibility() {
    const enabled = bookmarkManagerData.autoBackup.enabled;
    const frequencySection = document.getElementById('backupFrequencySection');
    const retentionSection = document.getElementById('backupRetentionSection');
    const folderSection = document.getElementById('backupFolderSection');

    if (frequencySection) {
        frequencySection.style.display = enabled ? 'block' : 'none';
    }
    if (retentionSection) {
        retentionSection.style.display = enabled ? 'block' : 'none';
    }
    if (folderSection) {
        folderSection.style.display = enabled ? 'block' : 'none';
    }
}

// Helper: Sync to chrome storage
async function syncToStorage() {
    try {
        await chrome.storage.local.set({ bookmarkManagerData: bookmarkManagerData });
    } catch (error) {
        console.error('Error syncing to storage:', error);
    }
}

// Helper: Load backup settings
function loadBackupSettings() {
    const autoBackupEnabled = document.getElementById('autoBackupEnabled');
    const backupFrequency = document.getElementById('backupFrequency');
    const backupRetention = document.getElementById('backupRetention');
    const backupFolderPath = document.getElementById('backupFolderPath');

    if (autoBackupEnabled) {
        autoBackupEnabled.checked = bookmarkManagerData.autoBackup.enabled;
    }
    if (backupFrequency) {
        backupFrequency.value = bookmarkManagerData.autoBackup.frequency;
    }
    if (backupRetention) {
        backupRetention.value = bookmarkManagerData.autoBackup.keepDays.toString();
    }
    if (backupFolderPath) {
        backupFolderPath.textContent = bookmarkManagerData.autoBackup.folderPath || 'Downloads';
    }

    updateBackupSettingsVisibility();
}

// Single DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', () => {

    // --- Section 1: Background thumbnails, pane toggles, mobile ---

    // Version display
    const manifestData = chrome.runtime.getManifest();
    const version = manifestData.version;
    const versionDisplay = document.getElementById('versionDisplay');
    if (versionDisplay) {
        versionDisplay.textContent = `TheTab.ninja version: ${version}`;
    }

    // Background thumbnails
    const backgroundThumbnailsContainer = document.getElementById('backgroundThumbnails');
    const backgroundImages = [
        'wp_none.png',
        'wp_img01.png',
        'wp_img02.png',
        'wp_img03.png',
        'wp_img05.png',
        'wp_img16.png',
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
    let selectedThumbnail = null;

    // Pane toggle listeners
    document.getElementById('toggleLeftPane').addEventListener('click', function () {
        togglePane('leftPane');
    });

    document.getElementById('toggleRightPane').addEventListener('click', function () {
        togglePane('rightPane');
    });

    // Mobile pane toggle buttons (positioned at bottom via CSS on mobile)
    const mobileLeftToggle = document.getElementById('mobileLeftPaneToggle');
    const mobileRightToggle = document.getElementById('mobileRightPaneToggle');

    if (mobileLeftToggle) {
        mobileLeftToggle.addEventListener('click', function () {
            const leftPane = document.getElementById('leftPane');
            const rightPane = document.getElementById('rightPane');
            // Close right pane if open
            if (rightPane.classList.contains('open')) {
                rightPane.classList.remove('open');
                if (mobileRightToggle) mobileRightToggle.classList.remove('active');
            }
            leftPane.classList.toggle('open');
            mobileLeftToggle.classList.toggle('active', leftPane.classList.contains('open'));
        });
    }

    if (mobileRightToggle) {
        mobileRightToggle.addEventListener('click', function () {
            const rightPane = document.getElementById('rightPane');
            const leftPane = document.getElementById('leftPane');
            // Close left pane if open
            if (leftPane.classList.contains('open')) {
                leftPane.classList.remove('open');
                if (mobileLeftToggle) mobileLeftToggle.classList.remove('active');
            }
            rightPane.classList.toggle('open');
            mobileRightToggle.classList.toggle('active', rightPane.classList.contains('open'));
        });
    }

    // Close mobile panes when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const leftPane = document.getElementById('leftPane');
            const rightPane = document.getElementById('rightPane');

            if (leftPane.classList.contains('open') &&
                !leftPane.contains(e.target) &&
                (!mobileLeftToggle || !mobileLeftToggle.contains(e.target))) {
                leftPane.classList.remove('open');
                if (mobileLeftToggle) mobileLeftToggle.classList.remove('active');
            }

            if (rightPane.classList.contains('open') &&
                !rightPane.contains(e.target) &&
                (!mobileRightToggle || !mobileRightToggle.contains(e.target))) {
                rightPane.classList.remove('open');
                if (mobileRightToggle) mobileRightToggle.classList.remove('active');
            }
        }

        // Close collection dropdown menus when clicking outside
        if (!e.target.closest('.collection-more-wrapper')) {
            document.querySelectorAll('.collection-dropdown.show').forEach(d => {
                d.classList.remove('show');
                d.closest('.collection').classList.remove('dropdown-open');
            });
        }
    });

    // Thumbnail selection helper
    function selectThumbnail(thumbnailElement) {
        if (selectedThumbnail) {
            selectedThumbnail.classList.remove('selected');
        }
        thumbnailElement.classList.add('selected');
        selectedThumbnail = thumbnailElement;
    }

    // Generate background thumbnails
    backgroundImages.forEach(imageName => {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = `assets/wallpapers/${imageName}`;
        thumbnailImg.alt = `Background ${imageName}`;
        thumbnailImg.className = 'background-thumbnail';
        thumbnailImg.dataset.imageName = imageName;

        if (savedBackground === imageName) {
            selectThumbnail(thumbnailImg);
            setBackground(imageName);

            const customData = loadCustomBackgrounds();
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            saveCustomBackgrounds(customData);
        }

        thumbnailImg.addEventListener('click', () => {
            const imageName = thumbnailImg.dataset.imageName;
            setBackground(imageName);
            localStorage.setItem('backgroundImage', imageName);

            const customData = loadCustomBackgrounds();
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            saveCustomBackgrounds(customData);

            selectThumbnail(thumbnailImg);

            document.querySelectorAll('.custom-background-thumbnail').forEach(thumb => {
                thumb.classList.remove('selected');
            });
        });

        backgroundThumbnailsContainer.appendChild(thumbnailImg);
    });

    // Default background if none saved
    if (!savedBackground && backgroundImages.length > 0) {
        const defaultImageName = 'wp_img16.png';
        const defaultThumbnail = backgroundThumbnailsContainer.querySelector(`.background-thumbnail[data-image-name="${defaultImageName}"]`);
        if (defaultThumbnail) {
            selectThumbnail(defaultThumbnail);
            setBackground(defaultImageName);
            localStorage.setItem('backgroundImage', defaultImageName);

            const customData = loadCustomBackgrounds();
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            saveCustomBackgrounds(customData);
        }
    }

    // Initialize custom backgrounds
    initCustomBackgrounds();

    // --- Section 2: Main initialization with all event listeners ---

    loadFromLocalStorage();

    // Migrate spaces to object format after loading
    migrateSpacesToObjectFormat();

    // Force cleanup of all existing favicon URLs
    forceCleanupAllFaviconUrls();

    // Clean up and re-save
    saveToLocalStorage();

    renderCollections();

    // Event-driven Chrome tab updates (replaces 5s polling)
    fetchChromeTabs();
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'tabsChanged' && !document.hidden) {
            fetchChromeTabs();
        }
    });
    // Refresh once when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            fetchChromeTabs();
        }
    });

    // Initialize spaces functionality
    initializeSpaces();

    // Add Collection button
    document.getElementById('addCollection').addEventListener('click', addCollection);

    // Settings event listeners
    document.getElementById('openInNewTab').addEventListener('change', (e) => {
        bookmarkManagerData.openInNewTab = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('closeWhenSaveTab').addEventListener('change', (e) => {
        bookmarkManagerData.closeWhenSaveTab = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('darkMode').addEventListener('change', (e) => {
        bookmarkManagerData.darkMode = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        saveToLocalStorage();
    });

    // Zen mode event listener
    document.getElementById('zenMode').addEventListener('change', (e) => {
        if (window.innerWidth <= 768) {
            e.target.checked = false;
            alert('Zen mode is not available on mobile devices for optimal user experience.');
            return;
        }

        bookmarkManagerData.zenMode = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        if (e.target.checked) {
            document.body.classList.add('zen-mode');
            startZenMode();
        } else {
            document.body.classList.remove('zen-mode');
            stopZenMode();
        }
        saveToLocalStorage();
        updateZenSettingsVisibility();
    });

    // Zen mode sub-settings event listeners
    document.getElementById('zenGreetingEnabled').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.greetingEnabled = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('zenGreetingLocale').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.greetingLocale = e.target.value;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('zenClockFormat').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.clockFormat = e.target.value;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('zenShowSeconds').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.showSeconds = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('zenClockStyle').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.clockStyle = e.target.value;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    document.getElementById('zenClockFont').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.clockFont = e.target.value;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
        applyZenClockFont();
    });

    document.getElementById('zenAmbientAnimation').addEventListener('change', (e) => {
        if (!bookmarkManagerData.zenConfig) bookmarkManagerData.zenConfig = {};
        bookmarkManagerData.zenConfig.ambientAnimation = e.target.value;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
        // Restart animation if zen mode is active
        if (bookmarkManagerData.zenMode && document.body.classList.contains('zen-mode')) {
            startZenAmbient();
        }
    });

    // Initialize zen mode if enabled (but not on mobile)
    if (bookmarkManagerData.zenMode && window.innerWidth > 768) {
        document.getElementById('zenMode').checked = true;
        document.body.classList.add('zen-mode');
        startZenMode();
    } else if (window.innerWidth <= 768) {
        document.getElementById('zenMode').checked = false;
        bookmarkManagerData.zenMode = false;
        document.body.classList.remove('zen-mode');
    }

    // Restore zen settings UI from bookmarkManagerData
    loadZenSettingsUI();
    updateZenSettingsVisibility();

    // Monitor window resize to disable zen mode on mobile
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768 && bookmarkManagerData.zenMode) {
            document.getElementById('zenMode').checked = false;
            bookmarkManagerData.zenMode = false;
            bookmarkManagerData.settingsLastModified = Date.now();
            document.body.classList.remove('zen-mode');
            stopZenMode();
            saveToLocalStorage();
            updateZenSettingsVisibility();
        }
    });

    // Auto-show pane settings
    document.getElementById('autoShowLeftPane').addEventListener('change', (e) => {
        bookmarkManagerData.autoShowLeftPane = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });
    document.getElementById('autoShowRightPane').addEventListener('change', (e) => {
        bookmarkManagerData.autoShowRightPane = e.target.checked;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
    });

    // Collapsible settings sections (accordion - only one open at a time)
    const allCollapsibleSections = document.querySelectorAll('.settings-section.collapsible');
    allCollapsibleSections.forEach(section => {
        section.querySelector('.settings-section-header').addEventListener('click', () => {
            const isOpen = section.classList.contains('open');
            allCollapsibleSections.forEach(s => s.classList.remove('open'));
            if (!isOpen) section.classList.add('open');
        });
    });
    // Open the first section (Preferences) by default
    const firstSection = document.querySelector('.settings-section.collapsible');
    if (firstSection) firstSection.classList.add('open');

    // Hide "Buy Me a Coffee" button toggle
    const hideCoffeeCheckbox = document.getElementById('hideCoffeeButton');
    if (hideCoffeeCheckbox) {
        hideCoffeeCheckbox.checked = !!bookmarkManagerData.hideCoffeeButton;
        if (bookmarkManagerData.hideCoffeeButton) {
            const btn = document.getElementById('supportButton');
            if (btn) btn.style.display = 'none';
        }

        hideCoffeeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Show guilt-trip dialog before hiding
                e.target.checked = false; // Reset until confirmed
                showHideCoffeeDialog();
            } else {
                bookmarkManagerData.hideCoffeeButton = false;
                bookmarkManagerData.settingsLastModified = Date.now();
                const btn = document.getElementById('supportButton');
                if (btn) btn.style.display = '';
                saveToLocalStorage();
            }
        });
    }

    // Import/Export event listeners
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
    document.getElementById('cleanupFaviconsButton').addEventListener('click', function() {
        forceCleanupAllFaviconUrls();
        saveToLocalStorage();
        renderCollections();
        alert('Favicon URLs have been cleaned up and fixed!');
    });

    // Ensure autoBackup object exists (backwards compatibility)
    if (!bookmarkManagerData.autoBackup) {
        bookmarkManagerData.autoBackup = {
            enabled: false, frequency: 'daily', keepDays: 7,
            lastBackup: null, customFolder: null, folderPath: 'Downloads', useCustomFolder: false
        };
    }

    // Backup settings event listeners
    document.getElementById('autoBackupEnabled').addEventListener('change', (e) => {
        bookmarkManagerData.autoBackup.enabled = e.target.checked;
        updateBackupSettingsVisibility();
        saveToLocalStorage();
        syncToStorage();
    });

    document.getElementById('backupFrequency').addEventListener('change', (e) => {
        bookmarkManagerData.autoBackup.frequency = e.target.value;
        bookmarkManagerData.autoBackup.enabled = e.target.value !== 'disabled';
        document.getElementById('autoBackupEnabled').checked = bookmarkManagerData.autoBackup.enabled;
        updateBackupSettingsVisibility();
        saveToLocalStorage();
        syncToStorage();
    });

    document.getElementById('backupRetention').addEventListener('change', (e) => {
        const keepDays = parseInt(e.target.value, 10);
        bookmarkManagerData.autoBackup.keepDays = isNaN(keepDays) ? 7 : keepDays;
        saveToLocalStorage();
        syncToStorage();
    });

    document.getElementById('manualBackupButton').addEventListener('click', async () => {
        const button = document.getElementById('manualBackupButton');
        const originalText = button.textContent;
        button.textContent = 'Creating backup...';
        button.disabled = true;

        try {
            const response = await sendMessageAsync({
                action: 'createManualBackup',
                data: bookmarkManagerData
            });

            if (response && response.success) {
                button.textContent = 'Backup created!';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2000);
            } else {
                throw new Error(response.error || 'Failed to create backup');
            }
        } catch (error) {
            alert('Error creating backup: ' + error.message);
            button.textContent = originalText;
            button.disabled = false;
        }
    });

    // Backup folder selection
    document.getElementById('selectBackupFolder').addEventListener('click', async () => {
        try {
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker({
                    mode: 'readwrite',
                    startIn: 'downloads'
                });

                // Store handle separately (not serializable to JSON)
                window._customFolderHandle = dirHandle;
                bookmarkManagerData.autoBackup.useCustomFolder = true;
                bookmarkManagerData.autoBackup.folderPath = dirHandle.name;

                document.getElementById('backupFolderPath').textContent = dirHandle.name;

                saveToLocalStorage();
                syncToStorage();

                alert('Backup folder updated to: ' + dirHandle.name);
            } else {
                const customPath = prompt('Enter custom subfolder name (will be created in Downloads):', 'TheTabNinja');
                if (customPath && customPath.trim()) {
                    bookmarkManagerData.autoBackup.useCustomFolder = true;
                    bookmarkManagerData.autoBackup.folderPath = 'Downloads/' + customPath.trim();
                    bookmarkManagerData.autoBackup.customFolderName = customPath.trim();

                    document.getElementById('backupFolderPath').textContent = bookmarkManagerData.autoBackup.folderPath;

                    saveToLocalStorage();
                    syncToStorage();

                    alert('Backups will be saved to: ' + bookmarkManagerData.autoBackup.folderPath);
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting backup folder:', error);
                alert('Error selecting folder: ' + error.message);
            }
        }
    });

    // Sync provider selector
    document.getElementById('syncProvider').addEventListener('change', (e) => {
        bookmarkManagerData.syncProvider = e.target.value;
        saveToLocalStorage();
        updateSyncProviderUI();
        updateSyncButtonVisibility();
    });

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

    // Google Drive event listeners
    document.getElementById('googleDriveConnectBtn').addEventListener('click', connectGoogleDrive);
    document.getElementById('googleDriveDisconnectBtn').addEventListener('click', () => {
        if (confirm('Disconnect from Google Drive? Your data will remain on Drive but will no longer sync.')) {
            disconnectGoogleDrive();
        }
    });

    // Auto-sync event listeners
    document.getElementById('autoSyncEnabled').addEventListener('change', (e) => {
        if (!bookmarkManagerData.autoSync) bookmarkManagerData.autoSync = {};
        bookmarkManagerData.autoSync.enabled = e.target.checked;
        updateAutoSyncDelayVisibility();
        saveToLocalStorage();
        if (!e.target.checked) {
            cancelAutoSync();
        }
    });

    document.getElementById('autoSyncDelay').addEventListener('change', (e) => {
        if (!bookmarkManagerData.autoSync) bookmarkManagerData.autoSync = {};
        bookmarkManagerData.autoSync.delaySeconds = parseInt(e.target.value, 10);
        saveToLocalStorage();
    });

    // Local Drive event listeners
    document.getElementById('localDriveSelectFolderBtn').addEventListener('click', connectLocalDrive);
    document.getElementById('localDriveChangeFolderBtn').addEventListener('click', changeLocalDriveFolder);
    document.getElementById('localDriveDisconnectBtn').addEventListener('click', () => {
        if (confirm('Disconnect from local folder? Your sync file will remain in the folder.')) {
            disconnectLocalDrive();
        }
    });

    // Sync button uses the unified dispatcher
    document.getElementById('syncButton').addEventListener('click', synchronize);

    // Help button event listener
    document.getElementById('helpButton').addEventListener('click', function() {
        if (bookmarkManagerData.openInNewTab) {
            window.open('tabninja_help.html', '_blank');
        } else {
            window.location.href = 'tabninja_help.html';
        }
    });

    // Collection sort order event listener
    document.getElementById('collectionSortOrder').addEventListener('change', (e) => {
        bookmarkManagerData.collectionSortOrder = e.target.value;
        bookmarkManagerData.settingsLastModified = Date.now();
        saveToLocalStorage();
        renderCollections();
    });

    // Debug functions
    window.debugSpacesSync = function() {
        const collections = bookmarkManagerData.collections.filter(c => !c.deleted);
        console.log('Collections with spaces:');
        collections.forEach(c => {
            console.log(`Collection "${c.name}": spaces=${JSON.stringify(c.spaces)}, lastModified=${new Date(c.lastModified).toISOString()}`);
        });
    };

    window.debugSorting = function() {
        const collections = bookmarkManagerData.collections.filter(c => !c.deleted);
        console.log('Collections sorting debug:');
        console.log('Current sort order:', bookmarkManagerData.collectionSortOrder);
        collections.forEach(c => {
            console.log(`"${c.name}": lastModified=${c.lastModified} (${new Date(c.lastModified).toISOString()}), position=${c.position}`);
        });

        const sorted = [...collections].sort(getSortComparator());
        console.log('Sorted order:');
        sorted.forEach((c, i) => {
            console.log(`${i+1}. "${c.name}": lastModified=${c.lastModified} (${new Date(c.lastModified).toISOString()})`);
        });

        console.log('Timestamp validation:');
        collections.forEach(c => {
            console.log(`"${c.name}": typeof lastModified = ${typeof c.lastModified}, isNaN = ${isNaN(c.lastModified)}, Number(lastModified) = ${Number(c.lastModified)}`);
        });
    };

    // Left pane tabs functionality
    initializeLeftPaneTabs();

    // Initialize pane auto-show on hover
    initPaneAutoShow();

    // Initialize sync provider UI
    updateSyncProviderUI();

    // Initialize auto-sync settings
    if (!bookmarkManagerData.autoSync) bookmarkManagerData.autoSync = { enabled: false, delaySeconds: 30 };
    const autoSyncEnabledEl = document.getElementById('autoSyncEnabled');
    if (autoSyncEnabledEl) autoSyncEnabledEl.checked = !!bookmarkManagerData.autoSync.enabled;
    const autoSyncDelayEl = document.getElementById('autoSyncDelay');
    if (autoSyncDelayEl) autoSyncDelayEl.value = (bookmarkManagerData.autoSync.delaySeconds || 30).toString();
    updateAutoSyncDelayVisibility();

    // Initialize GitHub fields and sync button visibility
    document.getElementById('githubUsername').value = bookmarkManagerData.githubConfig.username || '';
    document.getElementById('githubRepo').value = bookmarkManagerData.githubConfig.repo || '';
    document.getElementById('githubPat').value = bookmarkManagerData.githubConfig.pat || '';
    updateSyncButtonVisibility();

    // Load backup settings
    loadBackupSettings();

    // --- Custom CSS initialization ---
    // Ensure customCSS exists (backward compatibility)
    if (!bookmarkManagerData.customCSS) {
        bookmarkManagerData.customCSS = { enabled: false, code: '' };
    }

    const customCSSEnabledEl = document.getElementById('customCSSEnabled');
    const customCSSSettingsEl = document.getElementById('customCSSSettings');
    const customCSSCodeEl = document.getElementById('customCSSCode');

    // Restore saved state into UI
    if (customCSSEnabledEl) {
        customCSSEnabledEl.checked = !!bookmarkManagerData.customCSS.enabled;
    }
    if (customCSSCodeEl) {
        customCSSCodeEl.value = bookmarkManagerData.customCSS.code || '';
    }
    if (customCSSSettingsEl) {
        customCSSSettingsEl.style.display = bookmarkManagerData.customCSS.enabled ? 'block' : 'none';
    }

    // Apply custom CSS on page load
    applyCustomCSS();

    // Toggle handler
    if (customCSSEnabledEl) {
        customCSSEnabledEl.addEventListener('change', (e) => {
            bookmarkManagerData.customCSS.enabled = e.target.checked;
            if (customCSSSettingsEl) {
                customCSSSettingsEl.style.display = e.target.checked ? 'block' : 'none';
            }
            saveToLocalStorage();
            applyCustomCSS();
        });
    }

    // Apply button
    document.getElementById('customCSSApply').addEventListener('click', () => {
        bookmarkManagerData.customCSS.code = customCSSCodeEl.value;
        bookmarkManagerData.customCSS.enabled = true;
        if (customCSSEnabledEl) customCSSEnabledEl.checked = true;
        if (customCSSSettingsEl) customCSSSettingsEl.style.display = 'block';
        saveToLocalStorage();
        applyCustomCSS();
    });

    // Reset button
    document.getElementById('customCSSReset').addEventListener('click', () => {
        if (!confirm('Clear all custom CSS?')) return;
        bookmarkManagerData.customCSS.code = '';
        bookmarkManagerData.customCSS.enabled = false;
        if (customCSSEnabledEl) customCSSEnabledEl.checked = false;
        if (customCSSCodeEl) customCSSCodeEl.value = '';
        if (customCSSSettingsEl) customCSSSettingsEl.style.display = 'none';
        saveToLocalStorage();
        applyCustomCSS();
    });

    // Focus search box
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        setTimeout(() => {
            console.log('Focusing on search box');
            searchBox.focus();
        }, 100);
    }

    // Search box input listener
    document.getElementById('searchBox').addEventListener('input', function() {
        const searchTerm = this.value.trim();
        applyFilter(searchTerm);
    });

    // Search box keydown listener for Google/ChatGPT search
    document.getElementById('searchBox').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const searchTerm = this.value.trim();
            if (searchTerm.startsWith('?') && searchTerm.length > 1) {
                const googleQuery = searchTerm.substring(1);
                const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;

                if (bookmarkManagerData.openInNewTab) {
                    window.open(googleUrl, '_blank');
                } else {
                    window.location.href = googleUrl;
                }

                this.value = '';
                applyFilter('');
                event.preventDefault();
            } else if (searchTerm.startsWith('!') && searchTerm.length > 1) {
                const chatGptQuery = searchTerm.substring(1);
                const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatGptQuery)}`;

                if (bookmarkManagerData.openInNewTab) {
                    window.open(chatGptUrl, '_blank');
                } else {
                    window.location.href = chatGptUrl;
                }

                this.value = '';
                applyFilter('');
                event.preventDefault();
            }
        }
    });

    // Global drop handler for creating new Collections from Chrome tabs/groups/windows
    const creatableTypes = ['chromeTab', 'chromeTabGroup', 'chromeWindow'];

    document.addEventListener('dragover', (e) => {
        if (draggedItem && creatableTypes.includes(draggedItem.type)) {
            const closestCollection = e.target.closest('.collection');

            if (!closestCollection) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        }
    });

    document.addEventListener('drop', (e) => {
        if (draggedItem && creatableTypes.includes(draggedItem.type)) {
            const closestCollection = e.target.closest('.collection');
            const closestBookmarksContainer = e.target.closest('.bookmarks');

            if (!closestCollection && !closestBookmarksContainer) {
                e.preventDefault();

                // Build a default name from the dragged item
                const data = draggedItem.data;
                let defaultName;
                if (draggedItem.type === 'chromeTab') {
                    defaultName = data.title || 'New Collection';
                } else if (data.title && data.title.trim() !== '') {
                    defaultName = data.title;
                } else if (data.windowId) {
                    defaultName = generateWindowName(data.windowId);
                } else {
                    defaultName = formatDate(new Date());
                }

                // Capture dragged data before clearing
                const capturedItem = { ...draggedItem };
                draggedItem = null;

                // Show the same prompt as "Add Collection"
                const name = prompt('Enter collection name:', defaultName);
                if (!name) return;

                try {
                    const selfUrl = chrome.runtime.getURL('bm.html');
                    const currentSpace = bookmarkManagerData.currentSpace || 'Everything';

                    // Bump existing positions
                    bookmarkManagerData.collections.forEach(c => { c.position++; });

                    // Build bookmarks from dragged tabs
                    const bookmarks = [];
                    let tabs = [];
                    if (capturedItem.type === 'chromeTab') {
                        tabs = [capturedItem.data];
                    } else {
                        tabs = capturedItem.data.tabs || [];
                    }

                    let position = 0;
                    tabs.forEach(tab => {
                        if (!tab.url || tab.url === selfUrl || tab.url.startsWith('chrome://')) return;
                        bookmarks.push({
                            id: generateUUID(),
                            title: tab.title || 'Untitled',
                            url: tab.url,
                            description: '',
                            icon: tab.favIconUrl || 'assets/icons/default-icon.png',
                            lastModified: Date.now(),
                            deleted: false,
                            position: position++
                        });
                    });

                    const newCollection = {
                        id: generateUUID(),
                        name: name,
                        isOpen: true,
                        lastModified: Date.now(),
                        deleted: false,
                        position: 0,
                        spaces: currentSpace === 'Everything' ? ['Everything'] : ['Everything', currentSpace],
                        bookmarks: bookmarks
                    };

                    bookmarkManagerData.collections.push(newCollection);

                    // Close tabs if setting is enabled
                    if (bookmarkManagerData.closeWhenSaveTab) {
                        tabs.forEach(tab => {
                            const tabId = tab.tabId || tab.id;
                            if (tabId && tab.url !== selfUrl && tab.url && !tab.url.startsWith('chrome://')) {
                                chrome.tabs.remove(tabId).catch(() => {});
                            }
                        });
                    }

                    renderCollections();
                    saveToLocalStorage();

                    console.log('Created new collection from drop:', newCollection.name);

                    setTimeout(() => {
                        const el = document.querySelector(`[data-collection-id="${newCollection.id}"]`);
                        if (el) {
                            el.style.transition = 'background-color 0.3s ease';
                            el.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                            setTimeout(() => { el.style.backgroundColor = ''; }, 1000);
                        }
                    }, 100);

                } catch (error) {
                    console.error('Error creating collection from drop:', error);
                }
            }
        }
    });

    // --- Section 3: Support button confetti ---

    const supportButton = document.getElementById('supportButton');
    if (supportButton) {
        supportButton.addEventListener('mouseenter', function(e) {
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
