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
        e.dataTransfer.setData('text/plain', collectionId);
        e.dataTransfer.setData('application/json', JSON.stringify({type: 'collection', id: collectionId}));

        console.log('Starting collection drag, calling showSpaceDropZones');
        showSpaceDropZones();
    } else {
        console.warn('Collection element not found for drag start');
    }
}

// Start dragging a bookmark
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

// End drag operation
function dragEnd(e) {
    if (draggedItem && draggedItem.element) {
        draggedItem.element.classList.remove('dragging');
    }
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }

    hideSpaceDropZones();

    draggedItem = null;
    console.log('Drag ended, draggedItem reset');
}

// Handle dragging over collections container
function dragOverCollection(e) {
    if (!draggedItem) {
        return;
    }

    if (draggedItem.type === 'chromeTabGroup' ||
        draggedItem.type === 'chromeWindow' ||
        draggedItem.type === 'chromeTab') {
        e.stopPropagation();
        e.preventDefault();
        return;
    }

    if (draggedItem.type !== 'collection') {
        return;
    }

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

    if (placeholder) {
        placeholder.remove();
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
            console.warn('Prevented drop of collection on empty message');
            return;
        }
    });
}

// Handle dragover on bookmark container
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

// Handle dragleave on bookmark container
function dragLeaveBookmarkContainer(e) {
    this.classList.remove('drag-over');
}

// Handle dragover on individual bookmark
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

    const targetBookmark = this;
    const rect = targetBookmark.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const isBefore = yOffset < rect.height / 2;

    const container = targetBookmark.parentElement;
    const allBookmarks = Array.from(container.children).filter(el => el.classList.contains('bookmark'));
    const targetIndex = allBookmarks.indexOf(targetBookmark);

    if (placeholder && placeholder.parentNode === container) {
        container.removeChild(placeholder);
    }

    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.style.height = `${rect.height}px`;
    }

    const insertPosition = isBefore ? targetIndex : targetIndex + 1;

    if (allBookmarks[insertPosition] === draggedItem.element) return;

    container.insertBefore(placeholder, allBookmarks[insertPosition] || null);
}

// Drop a bookmark
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

    let dropIndex = Array.from(container.children).indexOf(placeholder);

    if (dropIndex === -1) {
        const containerRect = container.getBoundingClientRect();
        const yPos = e.clientY - containerRect.top;
        dropIndex = Math.floor((yPos / containerRect.height) * toCollection.bookmarks.length);
    }

    dropIndex = Math.max(0, Math.min(dropIndex, toCollection.bookmarks.length));

    movedBookmark.parentCollection = toCollectionId;
    movedBookmark.lastModified = Date.now();

    toCollection.bookmarks.splice(dropIndex, 0, movedBookmark);
    toCollection.lastModified = Date.now();

    toCollection.bookmarks.forEach((bookmark, index) => {
        bookmark.position = index;
    });

    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }

    renderCollections();
    saveToLocalStorage();
    draggedItem = null;
}

// Drop on bookmark container (handles Chrome tabs, windows, tab groups, and bookmarks)
function dropBookmarkContainer(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const selfUrl = chrome.runtime.getURL("bm.html");

    if (draggedItem) {
        const collectionElement = this.closest('.collection');
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
