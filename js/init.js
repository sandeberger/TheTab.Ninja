/**
 * init.js - Initialization and event listener registration
 * Merges all DOMContentLoaded handlers into a single entry point.
 * Removes duplicate event registrations and dead code.
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

// First DOMContentLoaded: Background thumbnails, pane toggles, mobile
document.addEventListener('DOMContentLoaded', () => {
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

    // Mobile pane toggle functionality
    const mobileLeftToggle = document.getElementById('mobileLeftPaneToggle');
    const mobileRightToggle = document.getElementById('mobileRightPaneToggle');

    if (mobileLeftToggle) {
        mobileLeftToggle.addEventListener('click', function () {
            const leftPane = document.getElementById('leftPane');
            leftPane.classList.toggle('open');
        });
    }

    if (mobileRightToggle) {
        mobileRightToggle.addEventListener('click', function () {
            const rightPane = document.getElementById('rightPane');
            rightPane.classList.toggle('open');
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
            }

            if (rightPane.classList.contains('open') &&
                !rightPane.contains(e.target) &&
                (!mobileRightToggle || !mobileRightToggle.contains(e.target))) {
                rightPane.classList.remove('open');
            }
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
        const defaultImageName = backgroundImages[0];
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
});

// Second DOMContentLoaded: Main initialization with all event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();

    // Migrate spaces to object format after loading
    migrateSpacesToObjectFormat();

    // Force cleanup of all existing favicon URLs
    forceCleanupAllFaviconUrls();

    // Clean up and re-save
    saveToLocalStorage();

    renderCollections();
    fetchChromeTabs();
    let fetchTabsInterval = setInterval(fetchChromeTabs, 5000);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(fetchTabsInterval);
            fetchTabsInterval = null;
        } else {
            fetchChromeTabs();
            fetchTabsInterval = setInterval(fetchChromeTabs, 5000);
        }
    });

    // Initialize spaces functionality
    initializeSpaces();

    // Add Collection button
    document.getElementById('addCollection').addEventListener('click', addCollection);

    // Settings event listeners
    document.getElementById('openInNewTab').addEventListener('change', (e) => {
        bookmarkManagerData.openInNewTab = e.target.checked;
        saveToLocalStorage();
    });

    document.getElementById('darkMode').addEventListener('change', (e) => {
        bookmarkManagerData.darkMode = e.target.checked;
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
        if (e.target.checked) {
            document.body.classList.add('zen-mode');
            startZenMode();
        } else {
            document.body.classList.remove('zen-mode');
            stopZenMode();
        }
        saveToLocalStorage();
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

    // Monitor window resize to disable zen mode on mobile
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768 && bookmarkManagerData.zenMode) {
            document.getElementById('zenMode').checked = false;
            bookmarkManagerData.zenMode = false;
            document.body.classList.remove('zen-mode');
            stopZenMode();
            saveToLocalStorage();
        }
    });

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
            const response = await chrome.runtime.sendMessage({
                action: 'createManualBackup',
                data: bookmarkManagerData
            });

            if (response.success) {
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

    // Helper: Update sync button visibility
    function updateSyncButtonVisibility() {
        const syncButton = document.getElementById('syncButton');
        syncButton.style.display = isGitHubConfigValid() ? 'flex' : 'none';
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

    // Initialize GitHub fields and sync button visibility
    document.getElementById('githubUsername').value = bookmarkManagerData.githubConfig.username || '';
    document.getElementById('githubRepo').value = bookmarkManagerData.githubConfig.repo || '';
    document.getElementById('githubPat').value = bookmarkManagerData.githubConfig.pat || '';
    updateSyncButtonVisibility();

    // Load backup settings
    loadBackupSettings();

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

    // Global drop handler for creating new Collections from Tab Groups
    document.addEventListener('dragover', (e) => {
        const creatableTypes = ['chromeTabGroup', 'chromeWindow'];

        if (draggedItem && creatableTypes.includes(draggedItem.type)) {
            const closestCollection = e.target.closest('.collection');

            if (!closestCollection) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        }
    });

    document.addEventListener('drop', (e) => {
        if (draggedItem && (draggedItem.type === 'chromeTabGroup' || draggedItem.type === 'chromeWindow')) {
            const closestCollection = e.target.closest('.collection');
            const closestBookmarksContainer = e.target.closest('.bookmarks');

            if (!closestCollection && !closestBookmarksContainer) {
                e.preventDefault();

                try {
                    const newCollection = createCollectionFromTabGroup(draggedItem.data);

                    renderCollections();
                    saveToLocalStorage();

                    console.log('Created new collection from tab group:', newCollection.name);

                    setTimeout(() => {
                        const newCollectionElement = document.querySelector(`[data-collection-id="${newCollection.id}"]`);
                        if (newCollectionElement) {
                            newCollectionElement.style.transition = 'background-color 0.3s ease';
                            newCollectionElement.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                            setTimeout(() => {
                                newCollectionElement.style.backgroundColor = '';
                            }, 1000);
                        }
                    }, 100);

                } catch (error) {
                    console.error('Error creating collection from tab group:', error);
                }

                draggedItem = null;
            }
        }
    });
});

// Support button confetti listeners (run after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
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
