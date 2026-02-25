/**
 * ui-render.js - UI rendering functions
 * Handles rendering collections, bookmarks, Chrome tabs, pane management, and search filtering.
 */

// Global applyFilter function for use by both search box and zen search
function applyFilter(searchTerm) {
    const collections = document.querySelectorAll('.collection');
    const isCollectionSearch = searchTerm.startsWith('#');
    const isGlobalSearch = searchTerm.startsWith('%');

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
        if (!collectionData) return;
        const bookmarksContainer = collectionElement.querySelector('.bookmarks');
        if (!bookmarksContainer) return;
        const bookmarkElements = bookmarksContainer.querySelectorAll('.bookmark');
        let showCollection = false;
        let hasVisibleBookmarks = false;

        if (!searchTerm) {
            collectionElement.classList.remove('hidden');
            bookmarkElements.forEach(b => b.classList.remove('hidden'));
            return;
        }

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
                if (!bookmarkData) return;
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
                if (!bookmarkData) return;
                const bookmarkMatch = searchTerms.some(term =>
                    bookmarkData.title.toLowerCase().includes(term) ||
                    bookmarkData.url.toLowerCase().includes(term)
                );

                bookmarkElement.classList.toggle('hidden', !bookmarkMatch);
                if (bookmarkMatch) hasVisibleBookmarks = true;
            });
            showCollection = hasVisibleBookmarks;
        }

        const bookmarksContainerElement = collectionElement.querySelector('.bookmarks');
        const toggleButton = collectionElement.querySelector('.toggle-collection');

        if (showCollection && !collectionElement.classList.contains('is-open')) {
            collectionElement.classList.add('is-open');
            bookmarksContainerElement.style.display = 'flex';
            if (toggleButton) toggleButton.textContent = '\u2228';
        } else if (!searchTerm) {
            if (collectionData && !collectionData.isOpen) {
                collectionElement.classList.remove('is-open');
                bookmarksContainerElement.style.display = 'none';
                if (toggleButton) toggleButton.textContent = '\u2227';
            }
        }

        collectionElement.classList.toggle('hidden', !showCollection);
    });
}

// Set background image
function setBackground(imageName, type = 'predefined') {
    if (type === 'custom') {
        // Only allow data:image/ URLs for custom backgrounds
        if (!imageName || !imageName.startsWith('data:image/')) return;
        document.body.style.backgroundImage = `url("${imageName}")`;
    } else if (imageName === 'wp_none.png') {
        document.body.style.backgroundImage = 'none';
    } else {
        // Sanitize predefined image name to prevent path traversal
        const sanitized = imageName.replace(/[^a-zA-Z0-9_.]/g, '');
        document.body.style.backgroundImage = `url("assets/wallpapers/large_${sanitized}")`;
    }
}

// Ensure it's also available on window for consistency
window.setBackground = setBackground;

// Get sort comparator based on current sort order
function getSortComparator() {
    const sortOrder = bookmarkManagerData.collectionSortOrder || 'userdefined';

    switch (sortOrder) {
        case 'name-az':
            return (a, b) => a.name.localeCompare(b.name);
        case 'name-za':
            return (a, b) => b.name.localeCompare(a.name);
        case 'modified-new':
            return (a, b) => {
                const aTime = Number(a.lastModified) || 0;
                const bTime = Number(b.lastModified) || 0;
                return bTime - aTime;
            };
        case 'modified-old':
            return (a, b) => {
                const aTime = Number(a.lastModified) || 0;
                const bTime = Number(b.lastModified) || 0;
                return aTime - bTime;
            };
        case 'userdefined':
        default:
            return (a, b) => (a.position || 0) - (b.position || 0);
    }
}

// Render all collections
function renderCollections() {
    const collectionsContainer = document.getElementById('collections');
    collectionsContainer.innerHTML = '';

    const currentSpace = bookmarkManagerData.currentSpace || 'Everything';

    const sortedCollections = bookmarkManagerData.collections
        .filter(c => !c.deleted)
        .filter(c => {
            if (currentSpace === 'Everything') {
                return true;
            }
            return c.spaces && Array.isArray(c.spaces) && c.spaces.includes(currentSpace);
        })
        .sort(getSortComparator());

    sortedCollections.forEach((collection) => {
        const collectionElement = document.createElement('div');
        collectionElement.className = `collection ${collection.isOpen ? 'is-open' : ''}`;
        collectionElement.setAttribute('draggable', bookmarkManagerData.collectionSortOrder === 'userdefined');
        collectionElement.dataset.collectionId = collection.id;

        const header = document.createElement('div');
        header.className = 'collection-header';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '\u2630';
        dragHandle.setAttribute('draggable', bookmarkManagerData.collectionSortOrder === 'userdefined');
        if (bookmarkManagerData.collectionSortOrder !== 'userdefined') {
            dragHandle.style.display = 'none';
        }

        const titleArea = document.createElement('div');
        titleArea.className = 'collection-title-area';

        const title = document.createElement('h2');
        title.textContent = collection.name;

        if (collection.spaces && collection.spaces.length > 1) {
            const spacesIndicator = document.createElement('span');
            spacesIndicator.className = 'spaces-indicator';
            spacesIndicator.style.cssText = `
                font-size: 12px;
                color: ${document.body.classList.contains('dark-mode') ? '#999' : '#666'};
                margin-left: 10px;
                font-weight: normal;
            `;
            const visibleSpaces = collection.spaces.filter(s => s !== 'Everything');
            if (visibleSpaces.length > 0) {
                spacesIndicator.textContent = `(${visibleSpaces.join(', ')})`;
                title.appendChild(spacesIndicator);
            }
        }

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-collection';
        toggleBtn.textContent = collection.isOpen ? '\u2228' : '\u2227';

        const actions = document.createElement('div');
        actions.className = 'collection-actions';

        const buttons = [
            { className: 'launch-collection', text: '\uD83D\uDE80', title: 'Open bookmarks in a Chrome group', action: () => launchCollection(collection.id) },
            { className: 'openall-collection', icon: 'outbox', title: 'Open bookmarks in this collection', action: () => launchAllTabs(collection.id) },
            { className: 'fetch-alltabs', icon: 'inbox', title: 'Get all Chrome tabs', action: () => fetchAllTabs(collection.id) },
            { className: 'add-bookmark', text: '+', title: 'Create bookmark', action: () => addBookmark(collection.id) },
            { className: 'edit-collection', text: '\u270F\uFE0F', title: 'Edit collection', action: () => editCollection(collection.id) },
            { className: 'edit-spaces', text: '\uD83C\uDFF7\uFE0F', title: 'Manage spaces for this collection', action: () => editCollectionSpaces(collection.id) },
            ...(bookmarkManagerData.collectionSortOrder === 'userdefined' ? [
                { className: 'move-collection', text: '\u25B2', title: 'Move collection up', action: () => moveCollection(collection.id, -1) },
                { className: 'move-collection', text: '\u25BC', title: 'Move collection down', action: () => moveCollection(collection.id, 1) }
            ] : []),
            { className: 'delete-collection', text: '\uD83D\uDDD1\uFE0F', title: 'Delete collection', action: () => deleteCollection(collection.id) }
        ];

        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = `collection-button ${btnConfig.className}`;
            btn.title = btnConfig.title;
            btn.addEventListener('click', btnConfig.action);

            if (btnConfig.icon === 'inbox') {
                btn.innerHTML = svgInbox;
            } else if (btnConfig.icon === 'outbox') {
                btn.innerHTML = svgOutbox;
            } else {
                btn.textContent = btnConfig.text;
            }

            actions.appendChild(btn);
        });

        titleArea.appendChild(dragHandle);
        titleArea.appendChild(title);
        titleArea.appendChild(toggleBtn);
        header.appendChild(titleArea);
        header.appendChild(actions);

        const bookmarksContainer = document.createElement('div');
        bookmarksContainer.className = 'bookmarks';
        bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';

        collection.bookmarks
            .filter(b => !b.deleted)
            .sort((a, b) => a.position - b.position)
            .forEach(bookmark => {
                const bookmarkElement = createBookmarkElement(bookmark, collection.id);
                bookmarksContainer.appendChild(bookmarkElement);
            });

        if (bookmarksContainer.children.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-collection-message';
            emptyMsg.textContent = 'Drag bookmarks here';
            emptyMsg.dataset.collectionId = collection.id;
            addEmptyMessageListeners(emptyMsg);
            bookmarksContainer.appendChild(emptyMsg);
        }

        dragHandle.addEventListener('dragstart', dragStartCollection);
        dragHandle.addEventListener('dragend', dragEnd);
        toggleBtn.addEventListener('click', () => toggleCollection(collection.id));

        collectionElement.appendChild(header);
        collectionElement.appendChild(bookmarksContainer);
        collectionsContainer.appendChild(collectionElement);

        addCollectionDragListeners(collectionElement);
    }); // end of sortedCollections.forEach

    // Re-apply search filter after rendering (moved outside loop)
    const searchBox = document.getElementById('searchBox');
    if (searchBox && searchBox.value) {
        const event = new Event('input');
        searchBox.dispatchEvent(event);
    }

}

// Validate that a URL uses a safe protocol
function isSafeUrl(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'ftp:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

// Open all tabs in a collection
function launchAllTabs(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const urls = collection.bookmarks
            .filter(bookmark => !bookmark.deleted && isSafeUrl(bookmark.url))
            .map(bookmark => bookmark.url);

        urls.forEach(url => {
            chrome.tabs.create({ url: url });
        });
    } else {
        console.error(`Collection with id ${collectionId} not found.`);
    }
}

// Create a button element
function createButton(className, text, tooltipText) {
    const button = document.createElement('button');
    button.className = `collection-button ${className}`;
    button.textContent = text;
    if (tooltipText) {
        button.title = tooltipText;
    }
    return button;
}

// Fetch all Chrome tabs into a collection
function fetchAllTabs(collectionId) {
    const selfUrl = chrome.runtime.getURL("bm.html");
    chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
        try {
            if (chrome.runtime.lastError) {
                console.error("Error fetching tabs:", chrome.runtime.lastError);
                return;
            }
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
                    if (tab.url === selfUrl) return;

                    const newBookmark = {
                        id: generateUUID(),
                        title: tab.title,
                        url: tab.url,
                        description: "",
                        icon: tab.favIconUrl || "assets/icons/default-icon.png",
                        lastModified: Date.now(),
                        deleted: false,
                        position: collection.bookmarks.length
                    };
                    collection.bookmarks.push(newBookmark);
                    if (bookmarkManagerData.closeWhenSaveTab && (tab.tabId || tab.id)) {
                        chrome.tabs.remove(tab.tabId || tab.id);
                    }
                });
                collection.lastModified = Date.now();
                renderCollections();
                saveToLocalStorage();
            }
        } catch (error) {
            console.error("Error in fetchAllTabs:", error);
        }
    });
}

// Create a bookmark DOM element
function createBookmarkElement(bookmark, collectionId) {
    if (bookmark.deleted) return null;
    const bookmarkElement = document.createElement('div');
    bookmarkElement.className = 'bookmark';
    bookmarkElement.setAttribute('draggable', 'true');
    bookmarkElement.dataset.collectionId = collectionId;
    bookmarkElement.dataset.bookmarkId = bookmark.id;

    const bookmarkIcon = document.createElement('img');

    let iconSrc = getSafeIconUrl(bookmark.icon);
    bookmarkIcon.src = iconSrc;
    bookmarkIcon.alt = 'Icon';

    bookmarkIcon.onerror = function() {
        this.src = FALLBACK_ICON;
        this.onerror = null;
    };

    const bookmarkTitle = document.createElement('h3');
    bookmarkTitle.textContent = bookmark.title;
    bookmarkTitle.title = bookmark.title;

    const bookmarkDescription = document.createElement('p');
    bookmarkDescription.textContent = bookmark.description || '';
    bookmarkDescription.title = bookmark.description || '';

    const editIcon = document.createElement('span');
    editIcon.className = 'edit-icon';
    editIcon.textContent = '\u270F\uFE0F';

    const deleteIcon = document.createElement('span');
    deleteIcon.className = 'delete-icon';
    deleteIcon.textContent = '\uD83D\uDDD1\uFE0F';

    bookmarkElement.appendChild(bookmarkIcon);
    bookmarkElement.appendChild(bookmarkTitle);
    bookmarkElement.appendChild(bookmarkDescription);
    bookmarkElement.appendChild(editIcon);
    bookmarkElement.appendChild(deleteIcon);

    bookmarkElement.addEventListener('dragstart', function(e) {
        dragStartBookmark.call(this, e);
        this.style.opacity = '0.5';
        this.style.transform = 'scale(0.95)';
    });
    bookmarkElement.addEventListener('dragend', function(e) {
        dragEnd.call(this, e);
        this.style.opacity = '1';
        this.style.transform = 'scale(1)';
        this.style.zIndex = 'auto';
    });
    bookmarkElement.addEventListener('dragover', function(e) {
        dragOverBookmark.call(this, e);
        this.style.transform = 'scale(1.02)';
        this.style.zIndex = '1000';
    });
    bookmarkElement.addEventListener('dragleave', function(e) {
        this.style.transform = 'scale(1)';
        this.style.zIndex = 'auto';
    });
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

// Add a new collection
function addCollection() {
    const today = new Date();
    const name = prompt('Enter collection name:', formatDate(today));
    if (name) {
        bookmarkManagerData.collections.forEach(c => {
            c.position++;
        });

        const currentSpace = bookmarkManagerData.currentSpace || 'Everything';
        const newCollection = {
            id: generateUUID(),
            name: name,
            isOpen: true,
            lastModified: Date.now(),
            deleted: false,
            position: 0,
            spaces: currentSpace === 'Everything' ? ['Everything'] : ['Everything', currentSpace],
            bookmarks: []
        };
        bookmarkManagerData.collections.push(newCollection);
        renderCollections();
        saveToLocalStorage();
    }
}

// Toggle collection open/closed state
function toggleCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        collection.isOpen = !collection.isOpen;
        collection.lastModified = Date.now();

        const collectionElement = document.querySelector(`.collection[data-collection-id="${collectionId}"]`);
        if (collectionElement) {
            collectionElement.classList.toggle('is-open', collection.isOpen);

            const bookmarksContainer = collectionElement.querySelector('.bookmarks');
            if (bookmarksContainer) {
                bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';
            }
        }

        saveToLocalStorage();
    }
}

// Delete a collection (soft delete)
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

// Open a bookmark URL
function openBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    // Block javascript: and other unsafe protocols
    if (!isSafeUrl(bookmark.url)) {
        console.warn('Blocked navigation to unsafe URL:', bookmark.url);
        return;
    }

    if (bookmarkManagerData.openInNewTab) {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    } else {
        window.location.href = bookmark.url;
    }
}

// Launch collection as Chrome tab group
function launchCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const urls = collection.bookmarks.filter(b => !b.deleted && isSafeUrl(b.url)).map(bookmark => bookmark.url);
        const extensionId = extId;

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

// Move collection up or down (skips soft-deleted collections)
function moveCollection(collectionId, direction) {
    const collections = bookmarkManagerData.collections;
    const currentIndex = collections.findIndex(c => c.id === collectionId);
    if (currentIndex === -1) return;

    // Find the next non-deleted collection in the given direction
    let targetIndex = currentIndex + direction;
    while (targetIndex >= 0 && targetIndex < collections.length && collections[targetIndex].deleted) {
        targetIndex += direction;
    }

    if (targetIndex >= 0 && targetIndex < collections.length) {
        const [movedCollection] = collections.splice(currentIndex, 1);
        collections.splice(targetIndex, 0, movedCollection);

        collections.forEach((collection, index) => {
            collection.position = index;
        });

        renderCollections();
        saveToLocalStorage();
    }
}

// Create Chrome tab DOM element
function createChromeTabElement(tab, windowId) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab';
    tabDiv.draggable = true;
    tabDiv.dataset.windowId = windowId;
    tabDiv.dataset.tabId = tab.id;

    const tabIcon = document.createElement('img');

    let iconSrc = getSafeIconUrl(tab.favIconUrl);
    tabIcon.src = iconSrc;

    tabIcon.onerror = function() {
        this.src = FALLBACK_ICON_DARK;
        this.onerror = null;
    };

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

    tabDiv.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'switchToTab',
            tabId: tab.id,
            windowId: windowId
        });
    });

    return tabDiv;
}

// Display fallback content when Chrome tabs unavailable
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

// Fetch and display Chrome tabs in the right pane
function fetchChromeTabs() {
    try {
        chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error fetching tabs:', chrome.runtime.lastError);
                return;
            }
            const contentDiv = document.getElementById('content');
            if (!contentDiv) return;
            contentDiv.innerHTML = '';

            if (response && response.length > 0) {
                response.forEach((windowData) => {
                    const windowDiv = document.createElement('div');
                    windowDiv.className = 'window';

                    windowDiv.setAttribute('draggable', true);
                    windowDiv.addEventListener('dragstart', function(e) {
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
                    const isOpen = (bookmarkManagerData.chromeWindowStates && bookmarkManagerData.chromeWindowStates[windowData.windowId]) !== false;
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
                        groupContainer.draggable = true;

                        const groupDragHandle = document.createElement('div');
                        groupDragHandle.className = 'group-drag-handle';
                        groupDragHandle.textContent = groupInfo && groupInfo.title ? groupInfo.title : 'Tab Group';

                        groupContainer.addEventListener('dragstart', function(e) {
                            e.stopPropagation();
                            draggedItem = {
                                type: 'chromeTabGroup',
                                data: {
                                    title: groupInfo ? groupInfo.title : 'Tab Group',
                                    tabs: groupTabs
                                }
                            };
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', 'chromeTabGroup');
                        });

                        groupContainer.addEventListener('dragend', dragEnd);

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

                    const ungroupedTabsContainer = document.createElement('div');
                    ungroupedTabsContainer.className = 'ungrouped-tabs';
                    ungroupedTabs.forEach(tabData => {
                        const tabDiv = createChromeTabElement({
                            id: tabData.tabId,
                            title: tabData.title,
                            url: tabData.url,
                            favIconUrl: tabData.favIconUrl
                        }, windowData.windowId);
                        ungroupedTabsContainer.appendChild(tabDiv);
                    });
                    tabsList.appendChild(ungroupedTabsContainer);

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
            } else {
                displayFallbackContent(contentDiv);
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Toggle left/right pane open/closed
function togglePane(paneId) {
    const pane = document.getElementById(paneId);
    const isOpen = !pane.classList.contains('closed');

    pane.classList.toggle('closed');

    if (paneId === 'leftPane') {
        bookmarkManagerData.leftPaneOpen = !isOpen;
    } else if (paneId === 'rightPane') {
        bookmarkManagerData.rightPaneOpen = !isOpen;
    }

    saveToLocalStorage();
}

// Apply saved pane states
function applyPaneStates() {
    const leftPane = document.getElementById('leftPane');
    const rightPane = document.getElementById('rightPane');

    if (!bookmarkManagerData.leftPaneOpen) {
        leftPane.classList.add('closed');
    }

    if (!bookmarkManagerData.rightPaneOpen) {
        rightPane.classList.add('closed');
    }
}
