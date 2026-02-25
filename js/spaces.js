/**
 * spaces.js - Spaces management functions
 * Handles workspace organization, space CRUD, and drag-to-space functionality.
 */

// Render spaces list in the left pane
function renderSpaces() {
    const spacesList = document.getElementById('spacesList');
    if (!spacesList) return;

    spacesList.innerHTML = '';

    migrateSpacesToObjectFormat();

    const activeSpaces = bookmarkManagerData.spaces.filter(space => !space.deleted);

    activeSpaces.forEach(spaceObj => {
        const spaceName = spaceObj.name;
        const escapedName = escapeHtml(spaceName);
        const spaceItem = document.createElement('div');
        spaceItem.className = 'space-item';
        if (spaceName === bookmarkManagerData.currentSpace) {
            spaceItem.classList.add('active');
        }

        spaceItem.innerHTML = `
            <span class="space-name">${escapedName}</span>
            ${spaceName !== 'Everything' ? '<button class="delete-space-btn" data-space="' + escapedName + '">\u00D7</button>' : ''}
        `;

        spaceItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-space-btn')) {
                selectSpace(spaceName);
            }
        });

        const deleteBtn = spaceItem.querySelector('.delete-space-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSpace(spaceName);
            });
        }

        spacesList.appendChild(spaceItem);
    });
}

// Add a new space
function addSpace() {
    const newSpaceNameInput = document.getElementById('newSpaceName');
    const spaceName = newSpaceNameInput.value.trim();

    if (!spaceName) {
        alert('Please enter a space name');
        return;
    }

    if (spaceName.length > 30) {
        alert('Space name must be 30 characters or less');
        return;
    }

    migrateSpacesToObjectFormat();

    const existingSpace = bookmarkManagerData.spaces.find(s => s.name === spaceName);
    if (existingSpace) {
        if (existingSpace.deleted) {
            existingSpace.deleted = false;
            existingSpace.lastModified = Date.now();
        } else {
            alert('A space with this name already exists');
            return;
        }
    } else {
        bookmarkManagerData.spaces.push({
            name: spaceName,
            deleted: false,
            lastModified: Date.now()
        });
    }
    saveToLocalStorage();

    newSpaceNameInput.value = '';
    renderSpaces();
}

// Delete a space (soft delete)
function deleteSpace(spaceName) {
    if (spaceName === 'Everything') {
        alert('Cannot delete the "Everything" space');
        return;
    }

    if (confirm(`Are you sure you want to delete the space "${spaceName}"?`)) {
        migrateSpacesToObjectFormat();

        const spaceObj = bookmarkManagerData.spaces.find(s => s.name === spaceName);
        if (spaceObj) {
            spaceObj.deleted = true;
            spaceObj.lastModified = Date.now();
        }

        if (bookmarkManagerData.currentSpace === spaceName) {
            bookmarkManagerData.currentSpace = 'Everything';
        }

        bookmarkManagerData.collections.forEach(collection => {
            if (collection.spaces && Array.isArray(collection.spaces)) {
                const spaceIndex = collection.spaces.indexOf(spaceName);
                if (spaceIndex > -1) {
                    collection.spaces.splice(spaceIndex, 1);
                    if (collection.spaces.length === 0 || !collection.spaces.includes('Everything')) {
                        collection.spaces = ['Everything'];
                    }
                    collection.lastModified = Date.now();
                }
            }
        });

        saveToLocalStorage();
        renderSpaces();
        renderCollections();
    }
}

// Select a space
function selectSpace(spaceName) {
    bookmarkManagerData.currentSpace = spaceName;
    saveToLocalStorage();
    renderSpaces();
    renderCollections();
}

// Initialize spaces functionality
function initializeSpaces() {
    if (!bookmarkManagerData.spaces || !Array.isArray(bookmarkManagerData.spaces)) {
        bookmarkManagerData.spaces = ['Everything'];
    }

    migrateSpacesToObjectFormat();

    let everythingSpace = bookmarkManagerData.spaces.find(s => s.name === 'Everything');
    if (!everythingSpace) {
        bookmarkManagerData.spaces.unshift({
            name: 'Everything',
            deleted: false,
            lastModified: Date.now()
        });
    } else {
        everythingSpace.deleted = false;
    }

    const activeSpaceNames = bookmarkManagerData.spaces.filter(s => !s.deleted).map(s => s.name);
    if (!bookmarkManagerData.currentSpace || !activeSpaceNames.includes(bookmarkManagerData.currentSpace)) {
        bookmarkManagerData.currentSpace = 'Everything';
    }

    const addSpaceBtn = document.getElementById('addSpaceBtn');
    const newSpaceNameInput = document.getElementById('newSpaceName');

    if (addSpaceBtn) {
        addSpaceBtn.addEventListener('click', addSpace);
    }

    if (newSpaceNameInput) {
        newSpaceNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addSpace();
            }
        });

        newSpaceNameInput.addEventListener('input', (e) => {
            const addBtn = document.getElementById('addSpaceBtn');
            if (addBtn) {
                addBtn.disabled = !e.target.value.trim();
            }
        });
    }

    renderSpaces();
}

// Show drop zones on space items for collection drag
function showSpaceDropZones() {
    // Always clean up existing listeners first to prevent accumulation
    hideSpaceDropZones();

    const spacesTab = document.getElementById('spaces-tab');
    if (!spacesTab || !spacesTab.classList.contains('active')) {
        return;
    }

    const spaceItems = document.querySelectorAll('.space-item');

    spaceItems.forEach(spaceItem => {
        spaceItem.classList.add('drop-zone-active');
        spaceItem.addEventListener('dragenter', spaceDragEnter);
        spaceItem.addEventListener('dragover', spaceDragOver);
        spaceItem.addEventListener('drop', spaceDropHandler);
        spaceItem.addEventListener('dragleave', spaceDragLeave);
    });
}

// Hide drop zones on space items
function hideSpaceDropZones() {
    const spaceItems = document.querySelectorAll('.space-item');
    spaceItems.forEach(spaceItem => {
        spaceItem.classList.remove('drop-zone-active', 'drag-over');
        spaceItem.removeEventListener('dragenter', spaceDragEnter);
        spaceItem.removeEventListener('dragover', spaceDragOver);
        spaceItem.removeEventListener('drop', spaceDropHandler);
        spaceItem.removeEventListener('dragleave', spaceDragLeave);
    });
}

// Space drag enter handler
function spaceDragEnter(e) {
    if (draggedItem && draggedItem.type === 'collection') {
        e.preventDefault();
    }
}

// Space drag over handler
function spaceDragOver(e) {
    if (draggedItem && draggedItem.type === 'collection') {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('drag-over');
        return false;
    } else {
        e.dataTransfer.dropEffect = 'none';
    }
}

// Space drag leave handler
function spaceDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

// Space drop handler - add collection to space
function spaceDropHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');

    if (!draggedItem || draggedItem.type !== 'collection') {
        return;
    }

    const spaceNameElement = this.querySelector('.space-name');
    if (!spaceNameElement) return;

    const targetSpaceName = spaceNameElement.textContent.trim();
    const collectionId = draggedItem.collectionId;

    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        if (!collection.spaces) {
            collection.spaces = ['Everything'];
        }

        if (!collection.spaces.includes(targetSpaceName)) {
            collection.spaces.push(targetSpaceName);
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();

            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            `;
            feedback.textContent = `"${collection.name}" added to "${targetSpaceName}"`;
            document.body.appendChild(feedback);

            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 3000);
        } else {
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #FF9800;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            `;
            feedback.textContent = `"${collection.name}" already in "${targetSpaceName}"`;
            document.body.appendChild(feedback);

            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 2000);
        }
    }
}
