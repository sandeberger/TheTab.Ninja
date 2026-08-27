/**
 * drag-drop.js - Drag and drop functionality
 * Handles dragging collections, bookmarks, and Chrome tabs between containers.
 */

// Start dragging a collection
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
        e.dataTransfer.effectAllowed = 'copyMove';
        // Internal reorder / space-move reads the draggedItem global, so the
        // structured token lives in application/json (not text/plain).
        e.dataTransfer.setData('application/json', JSON.stringify({type: 'collection', id: collectionId}));

        // External drop targets read text/plain: LaunchDeck/FileNinja/CrossWIRE
        // get a tabninja:// virtual path (their native format - resolved by
        // FileNinja, like tag:// and crosswire://). Browser contexts (tab strip,
        // other pages) read text/uri-list and get the extension deep link, and
        // DownloadURL materializes a launcher file when dropped onto the OS
        // (Chrome/Edge; Firefox ignores it - use "Save desktop shortcut" there).
        try {
            const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
            if (collection) {
                const html = buildCollectionLauncherHTML(collection);
                const filename = buildLauncherFilename(collection.name);
                e.dataTransfer.setData('DownloadURL', `text/html:${filename}:${htmlToDataUrl(html)}`);
                e.dataTransfer.setData('text/uri-list', buildCollectionDeepLink(collection));
                e.dataTransfer.setData('text/plain', buildTabNinjaUri('collection', collection.name));

                // The collection itself, for native drop targets that want the links
                // rather than a file (LaunchDeck expands a drop into a folder of icons).
                //
                // DownloadURL cannot serve them: Chromium offers a drop target exactly ONE
                // virtual file, and because text/uri-list is set above that file is the .url
                // shortcut - verified from a real drop, whose FileGroupDescriptorW held a
                // single entry, 'link.html.url'. Explorer still materializes the launcher
                // HTML from DownloadURL, so the desktop drop is unaffected; this simply
                // gives everyone else the same data without a file in the way.
                //
                // Same payload the launcher HTML embeds (buildCollectionPayload), so the
                // two can never disagree about what a collection is.
                e.dataTransfer.setData(
                    'application/x-tabninja-collection',
                    JSON.stringify(buildCollectionPayload(collection)));
            }
        } catch (err) {
            console.warn('Could not attach desktop-drop data:', err);
        }

        showSpaceDropZones();
    }
}

// Start dragging a bookmark
function dragStartBookmark(e) {
    const bookmarkElement = this;
    const collectionElement = bookmarkElement.closest('.collection');
    if (!collectionElement) return;
    const collectionId = collectionElement.dataset.collectionId;
    const bookmarkId = bookmarkElement.dataset.bookmarkId;

    draggedItem = {
        type: 'bookmark',
        element: bookmarkElement,
        collectionId: collectionId,
        bookmarkId: bookmarkId
    };
    setTimeout(() => bookmarkElement.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'copyMove';

    // External drop targets (LaunchDeck, other apps, the desktop) read text/plain.
    // Give them the bookmark's real URL - never an internal token. Internal drops
    // read the draggedItem global, not dataTransfer, so this is safe.
    let url = null, title = null;
    try {
        const collectionData = bookmarkManagerData.collections.find(c => c.id === collectionId);
        const bookmarkData = collectionData && (collectionData.bookmarks || []).find(b => b.id === bookmarkId);
        if (bookmarkData && isSafeUrl(bookmarkData.url)) {
            url = bookmarkData.url;
            title = bookmarkData.title || bookmarkData.url;
        }
    } catch (err) {
        console.warn('Could not read bookmark for drag:', err);
    }

    if (url) {
        e.dataTransfer.setData('text/plain', url);
        e.dataTransfer.setData('text/uri-list', url);        // Chrome/Edge web shortcut
        e.dataTransfer.setData('text/x-moz-url', `${url}\n${title}`); // Firefox
    } else {
        e.dataTransfer.setData('text/plain', '');
    }
}

// End drag operation
function dragEnd(e) {
    if (draggedItem && draggedItem.element) {
        draggedItem.element.classList.remove('dragging');
    }
    removePlaceholder();
    hideSpaceDropZones();
    draggedItem = null;
}

// Remove placeholder from DOM
function removePlaceholder() {
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder = null;
}

// Create bookmark-sized placeholder for flex-wrap grid
function ensureBookmarkPlaceholder() {
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'bookmark-placeholder';
    }
    return placeholder;
}

// Find the best insertion index among bookmarks in a flex-wrap container.
// Uses both X and Y to work with multi-row grids.
function findInsertionIndex(container, mouseX, mouseY, excludeElement) {
    const bookmarks = Array.from(container.children).filter(
        el => el.classList.contains('bookmark') && el !== excludeElement && !el.classList.contains('dragging')
    );

    if (bookmarks.length === 0) return 0;

    // Measure all bookmark rects
    const rects = bookmarks.map(el => el.getBoundingClientRect());

    // Determine row height from the gap between first two different-Y bookmarks
    const rowCenters = [];
    let currentRowY = null;
    for (const r of rects) {
        const cy = r.top + r.height / 2;
        if (currentRowY === null || Math.abs(cy - currentRowY) > r.height * 0.3) {
            rowCenters.push(cy);
            currentRowY = cy;
        }
    }

    // Find which row the mouse is closest to
    let bestRow = 0;
    let bestRowDist = Infinity;
    for (let i = 0; i < rowCenters.length; i++) {
        const dist = Math.abs(mouseY - rowCenters[i]);
        if (dist < bestRowDist) {
            bestRowDist = dist;
            bestRow = i;
        }
    }

    // If mouse is well below all rows, insert at end
    const lastRect = rects[rects.length - 1];
    if (mouseY > lastRect.bottom + 20) {
        return bookmarks.length;
    }

    // Filter bookmarks on that row
    const rowY = rowCenters[bestRow];
    const rowBookmarks = [];
    const rowIndices = [];
    for (let i = 0; i < bookmarks.length; i++) {
        const cy = rects[i].top + rects[i].height / 2;
        if (Math.abs(cy - rowY) < rects[i].height * 0.3) {
            rowBookmarks.push(bookmarks[i]);
            rowIndices.push(i);
        }
    }

    if (rowBookmarks.length === 0) return bookmarks.length;

    // Check if mouse is before the first bookmark in the row
    const firstRowRect = rowBookmarks[0].getBoundingClientRect();
    if (mouseX < firstRowRect.left + firstRowRect.width / 2) {
        return rowIndices[0];
    }

    // Check each bookmark in the row
    for (let i = 0; i < rowBookmarks.length; i++) {
        const rect = rowBookmarks[i].getBoundingClientRect();
        const midX = rect.left + rect.width / 2;

        if (mouseX < midX) {
            return rowIndices[i];
        }
    }

    // Mouse is after the last bookmark in the row — insert after it
    return rowIndices[rowIndices.length - 1] + 1;
}

// Insert placeholder at a given index among bookmark children
function insertPlaceholderAt(container, index, excludeElement) {
    const ph = ensureBookmarkPlaceholder();
    const bookmarks = Array.from(container.children).filter(
        el => el.classList.contains('bookmark') && el !== excludeElement && !el.classList.contains('dragging')
    );

    if (ph.parentNode === container) {
        container.removeChild(ph);
    }

    if (index >= bookmarks.length) {
        container.appendChild(ph);
    } else {
        container.insertBefore(ph, bookmarks[index]);
    }
}

// Handle dragging over collections container
function dragOverCollection(e) {
    if (!draggedItem) return;

    if (draggedItem.type === 'chromeTabGroup' ||
        draggedItem.type === 'chromeWindow' ||
        draggedItem.type === 'chromeTab') {
        e.stopPropagation();
        e.preventDefault();
        return;
    }

    if (draggedItem.type !== 'collection') return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const collectionsContainer = document.getElementById('collections');
    const collections = Array.from(collectionsContainer.querySelectorAll('.collection:not(.dragging)'));

    const mouseY = e.clientY;

    let closestCollection = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    let shouldPlaceBefore = true;

    collections.forEach(collection => {
        const rect = collection.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const offset = mouseY - centerY;

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

    // Use a collection-level placeholder (full-width)
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }

    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }

    if (!closestCollection) {
        collectionsContainer.appendChild(placeholder);
    } else if (shouldPlaceBefore) {
        closestCollection.parentNode.insertBefore(placeholder, closestCollection);
    } else {
        closestCollection.parentNode.insertBefore(placeholder, closestCollection.nextSibling);
    }
}

// Drop a collection
function dropCollection(e) {
    e.preventDefault();

    if (!draggedItem || draggedItem.type !== 'collection') return;

    const droppedCollectionId = draggedItem.collectionId;
    const collections = bookmarkManagerData.collections;
    const droppedIndex = collections.findIndex(c => c.id === droppedCollectionId);

    if (droppedIndex === -1) return;

    const [movedCollection] = collections.splice(droppedIndex, 1);

    if (placeholder && placeholder.parentNode) {
        const placeholderIndex = Array.from(placeholder.parentNode.children)
            .filter(el => el.classList.contains('collection') || el === placeholder)
            .indexOf(placeholder);

        const adjustedIndex = placeholderIndex < droppedIndex ? placeholderIndex : placeholderIndex - 1;

        collections.splice(adjustedIndex, 0, movedCollection);
        movedCollection.lastModified = Date.now();
    } else {
        collections.push(movedCollection);
        movedCollection.lastModified = Date.now();
    }

    removePlaceholder();
    draggedItem = null;

    bookmarkManagerData.collections.forEach((collection, index) => {
        collection.position = index;
    });

    saveToLocalStorage();
    renderCollections();
}

// Add listeners to empty collection messages
function addEmptyMessageListeners(emptyMessage) {
    emptyMessage.addEventListener('dragover', (e) => {
        if (draggedItem && draggedItem.type === 'collection') {
            e.preventDefault();
            e.stopPropagation();
            emptyMessage.style.backgroundColor = '#ffebee';
        }
    });

    emptyMessage.addEventListener('dragleave', (e) => {
        emptyMessage.style.backgroundColor = '';
    });

    emptyMessage.addEventListener('drop', (e) => {
        if (draggedItem && draggedItem.type === 'collection') {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    });
}

// Handle dragover on bookmark container — computes insertion point in flex-wrap grid
function dragOverBookmarkContainer(e) {
    if (!draggedItem) return;

    // Allow Chrome tab/window/group drops
    if (draggedItem.type === 'chromeTab' ||
        draggedItem.type === 'chromeWindow' ||
        draggedItem.type === 'chromeTabGroup') {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('drag-over');
        return;
    }

    if (draggedItem.type !== 'bookmark') return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const container = this;
    const excludeEl = draggedItem.element;
    const index = findInsertionIndex(container, e.clientX, e.clientY, excludeEl);
    insertPlaceholderAt(container, index, excludeEl);
}

// Handle dragleave on bookmark container
function dragLeaveBookmarkContainer(e) {
    this.classList.remove('drag-over');
    // Only remove placeholder if we truly left the container
    if (!this.contains(e.relatedTarget)) {
        removePlaceholder();
    }
}

// Handle dragover on individual bookmark — delegates to container logic
function dragOverBookmark(e) {
    if (!draggedItem) return;

    if (draggedItem.type === 'chromeTabGroup' ||
        draggedItem.type === 'chromeWindow' ||
        draggedItem.type === 'chromeTab') {
        e.preventDefault();
        return;
    }

    if (draggedItem.type !== 'bookmark') return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Delegate positioning to container-level logic
    const container = this.parentElement;
    if (container && container.classList.contains('bookmarks')) {
        const excludeEl = draggedItem.element;
        const index = findInsertionIndex(container, e.clientX, e.clientY, excludeEl);
        insertPlaceholderAt(container, index, excludeEl);
    }
}

// Drop a bookmark (on another bookmark)
function dropBookmark(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.type !== 'bookmark') return;

    const targetCollection = this.closest('.collection');
    if (!targetCollection) return;

    performBookmarkDrop(targetCollection, this.closest('.bookmarks'));
}

// Drop on bookmark container (handles Chrome tabs, windows, tab groups, and bookmarks)
function dropBookmarkContainer(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const selfUrl = chrome.runtime.getURL("bm.html");

    if (!draggedItem) return;

    const collectionElement = this.closest('.collection');
    if (!collectionElement) return;
    const collectionId = collectionElement.dataset.collectionId;
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    if (draggedItem.type === 'chromeTabGroup') {
        let tabsArray = draggedItem.data.tabs || [];
        tabsArray.forEach(tab => {
            if (tab.url === selfUrl) return;
            const newBookmark = {
                id: generateUUID(),
                title: tab.title,
                url: tab.url,
                description: "",
                icon: tab.favIconUrl || 'assets/icons/default-icon.png',
                lastModified: Date.now(),
                deleted: false,
                position: collection.bookmarks.length
            };
            collection.bookmarks.push(newBookmark);
        });
        collection.lastModified = Date.now();
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
    } else if (draggedItem.type === 'chromeWindow') {
        let tabsArray = draggedItem.data.tabs || [];
        tabsArray.forEach(tab => {
            if (tab.url === selfUrl) return;
            const newBookmark = {
                id: generateUUID(),
                title: tab.title,
                url: tab.url,
                description: "",
                icon: tab.favIconUrl || 'assets/icons/default-icon.png',
                lastModified: Date.now(),
                deleted: false,
                position: collection.bookmarks.length
            };
            collection.bookmarks.push(newBookmark);
        });
        collection.lastModified = Date.now();
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
        if (draggedItem.data.url === selfUrl) {
            draggedItem = null;
            return;
        }
        const newBookmark = {
            id: generateUUID(),
            title: draggedItem.data.title,
            url: draggedItem.data.url,
            description: '',
            icon: draggedItem.data.icon || 'assets/icons/default-icon.png',
            lastModified: Date.now(),
            deleted: false,
            position: collection.bookmarks.length
        };
        collection.bookmarks.push(newBookmark);
        collection.lastModified = Date.now();
        if (bookmarkManagerData.closeWhenSaveTab &&
            (draggedItem.data.tabId || draggedItem.data.id) &&
            draggedItem.data.url !== selfUrl) {
            chrome.tabs.remove(draggedItem.data.tabId || draggedItem.data.id);
        }
        saveToLocalStorage();
        renderCollections();
        draggedItem = null;
        return;
    }

    if (draggedItem.type === 'bookmark') {
        performBookmarkDrop(collectionElement, this);
        return;
    }

    draggedItem = null;
}

// Shared logic for dropping a bookmark (used by both dropBookmark and dropBookmarkContainer)
function performBookmarkDrop(collectionElement, container) {
    if (!draggedItem || draggedItem.type !== 'bookmark') return;

    const toCollectionId = collectionElement.dataset.collectionId;
    const fromCollectionId = draggedItem.collectionId;

    const fromCollection = bookmarkManagerData.collections.find(c => c.id === fromCollectionId);
    const toCollection = bookmarkManagerData.collections.find(c => c.id === toCollectionId);
    if (!fromCollection || !toCollection) return;

    const bookmarkIndex = fromCollection.bookmarks.findIndex(b => b.id === draggedItem.bookmarkId);
    if (bookmarkIndex === -1) return;

    const [movedBookmark] = fromCollection.bookmarks.splice(bookmarkIndex, 1);

    // Determine drop index from placeholder position
    let dropIndex = -1;
    if (placeholder && placeholder.parentNode && container) {
        const children = Array.from(container.children).filter(
            el => el.classList.contains('bookmark') || el === placeholder
        );
        dropIndex = children.indexOf(placeholder);
    }

    if (dropIndex === -1) {
        dropIndex = toCollection.bookmarks.filter(b => !b.deleted).length;
    }

    // Clamp
    const activeBookmarks = toCollection.bookmarks.filter(b => !b.deleted).length;
    dropIndex = Math.max(0, Math.min(dropIndex, activeBookmarks));

    movedBookmark.parentCollection = toCollectionId;
    movedBookmark.lastModified = Date.now();

    toCollection.bookmarks.splice(dropIndex, 0, movedBookmark);
    toCollection.lastModified = Date.now();
    if (fromCollectionId !== toCollectionId) {
        fromCollection.lastModified = Date.now();
    }

    toCollection.bookmarks.forEach((bookmark, index) => {
        bookmark.position = index;
    });

    removePlaceholder();
    draggedItem = null;

    renderCollections();
    saveToLocalStorage();
}

// Add drag listeners to a bookmark element
function addBookmarkDragListeners(bookmarkElement) {
    bookmarkElement.addEventListener('dragstart', dragStartBookmark);
    bookmarkElement.addEventListener('dragend', dragEnd);
    bookmarkElement.addEventListener('dragover', dragOverBookmark);
    bookmarkElement.addEventListener('drop', dropBookmark);
}

// Add drag listeners to a collection element
function addCollectionDragListeners(collectionElement) {
    const dragHandle = collectionElement.querySelector('.drag-handle');
    if (dragHandle) {
        dragHandle.addEventListener('dragstart', dragStartCollection);
        dragHandle.addEventListener('dragend', dragEnd);
    }

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
