/**
 * ui-dialogs.js - Dialog UI functions for editing collections and bookmarks
 * Handles modal dialogs for CRUD operations.
 */

// Edit collection name dialog
function editCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const inputBg = isDarkMode ? '#3a3a3a' : 'white';
    const inputBorder = isDarkMode ? '#555' : '#ccc';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex;
        align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: ${dialogBg}; color: ${textColor}; padding: 25px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 350px; max-width: 500px;
        border: 1px solid ${isDarkMode ? '#555' : '#ddd'};
        backdrop-filter: blur(10px); animation: fadeIn 0.2s ease;
    `;

    dialog.innerHTML = `
        <h3 style="color: ${textColor}; margin-top: 0; margin-bottom: 20px; font-size: 18px;">Edit Collection Name</h3>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">Collection Name:</label>
            <input type="text" id="collectionNameInput" value="${collection.name}" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor};
                transition: border-color 0.2s ease;
            " placeholder="Enter collection name">
        </div>
        <div style="margin-top: 25px; text-align: right;">
            <button id="cancelEdit" style="
                margin-right: 12px; padding: 10px 20px; background: ${cancelBg};
                color: ${cancelTextColor}; border: 1px solid ${isDarkMode ? '#666' : '#ccc'};
                border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease;
            ">Cancel</button>
            <button id="saveEdit" style="
                padding: 10px 20px; background: #4CAF50; color: white;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease;
            ">Save</button>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = dialog.querySelector('#collectionNameInput');
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);

    const cancelBtn = dialog.querySelector('#cancelEdit');
    const saveBtn = dialog.querySelector('#saveEdit');

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = isDarkMode ? '#555' : '#e0e0e0';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = cancelBg;
    });

    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.background = '#45a049';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.background = '#4CAF50';
    });

    input.addEventListener('focus', () => {
        input.style.borderColor = '#4CAF50';
    });
    input.addEventListener('blur', () => {
        input.style.borderColor = inputBorder;
    });

    function closeDialog() {
        document.body.removeChild(overlay);
        document.head.removeChild(style);
    }

    function saveCollection() {
        const newName = input.value.trim();
        if (newName && newName !== collection.name) {
            collection.name = newName;
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
        }
        closeDialog();
    }

    cancelBtn.addEventListener('click', closeDialog);
    saveBtn.addEventListener('click', saveCollection);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveCollection();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog();
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}

// Edit collection spaces dialog
function editCollectionSpaces(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    migrateSpacesToObjectFormat();
    const availableSpaces = bookmarkManagerData.spaces
        .filter(space => !space.deleted)
        .map(space => space.name) || ['Everything'];
    const currentSpaces = collection.spaces || ['Everything'];

    const isDarkMode = document.body.classList.contains('dark-mode');
    const labelColor = isDarkMode ? '#e0e0e0' : '#333';

    const spacesHtml = availableSpaces.map(space => {
        const checked = currentSpaces.includes(space) ? 'checked' : '';
        const disabled = space === 'Everything' ? 'disabled' : '';
        return `
            <label style="display: block; margin: 5px 0; color: ${labelColor}; cursor: pointer;">
                <input type="checkbox" value="${space}" ${checked} ${disabled} style="margin-right: 8px;">
                ${space}
                ${space === 'Everything' ? ' (always included)' : ''}
            </label>
        `;
    }).join('');

    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';

    const dialogHtml = `
        <div id="spacesDialog" style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: ${dialogBg}; color: ${textColor}; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000; min-width: 300px;
            max-height: 400px; overflow-y: auto; border: 1px solid ${isDarkMode ? '#555' : '#ddd'};
        ">
            <h3 style="color: ${textColor}; margin-top: 0;">Select Spaces for "${collection.name}"</h3>
            <div style="margin: 15px 0;">
                ${spacesHtml}
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button id="cancelSpaces" style="
                    margin-right: 10px; padding: 8px 16px; background: ${cancelBg};
                    color: ${cancelTextColor}; border: 1px solid ${isDarkMode ? '#666' : '#ccc'};
                    border-radius: 4px; cursor: pointer;
                ">Cancel</button>
                <button id="saveSpaces" style="
                    padding: 8px 16px; background: #4CAF50; color: white;
                    border: none; border-radius: 4px; cursor: pointer;
                ">Save</button>
            </div>
        </div>
        <div id="spacesOverlay" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999;
        "></div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHtml);

    const cancelBtn = document.getElementById('cancelSpaces');
    const saveBtn = document.getElementById('saveSpaces');

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = isDarkMode ? '#555' : '#e0e0e0';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = cancelBg;
    });

    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.backgroundColor = '#45a049';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.backgroundColor = '#4CAF50';
    });

    document.getElementById('saveSpaces').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#spacesDialog input[type="checkbox"]');
        const selectedSpaces = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (!selectedSpaces.includes('Everything')) {
            selectedSpaces.unshift('Everything');
        }

        collection.spaces = selectedSpaces;
        collection.lastModified = Date.now();
        saveToLocalStorage();
        renderCollections();

        document.getElementById('spacesDialog').remove();
        document.getElementById('spacesOverlay').remove();
    });

    document.getElementById('cancelSpaces').addEventListener('click', () => {
        document.getElementById('spacesDialog').remove();
        document.getElementById('spacesOverlay').remove();
    });

    document.getElementById('spacesOverlay').addEventListener('click', () => {
        document.getElementById('spacesDialog').remove();
        document.getElementById('spacesOverlay').remove();
    });
}

// Add bookmark dialog
async function addBookmark(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const inputBg = isDarkMode ? '#3a3a3a' : 'white';
    const inputBorder = isDarkMode ? '#555' : '#ccc';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex;
        align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: ${dialogBg}; color: ${textColor}; padding: 25px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 400px; max-width: 600px;
        border: 1px solid ${isDarkMode ? '#555' : '#ddd'};
        backdrop-filter: blur(10px); animation: fadeIn 0.2s ease;
    `;

    dialog.innerHTML = `
        <h3 style="color: ${textColor}; margin-top: 0; margin-bottom: 20px; font-size: 18px;">Create Bookmark</h3>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">Title:</label>
            <input type="text" id="bookmarkTitleInput" value="" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor};
                transition: border-color 0.2s ease;
            " placeholder="Enter bookmark title">
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">URL:</label>
            <input type="url" id="bookmarkUrlInput" value="https://" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor};
                transition: border-color 0.2s ease;
            " placeholder="https://example.com">
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">Description (optional):</label>
            <textarea id="bookmarkDescInput" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor}; resize: vertical;
                min-height: 80px; transition: border-color 0.2s ease;
            " placeholder="Enter description (optional)"></textarea>
        </div>
        <div style="margin-top: 25px; text-align: right;">
            <button id="cancelCreateBookmark" style="
                margin-right: 12px; padding: 10px 20px; background: ${cancelBg};
                color: ${cancelTextColor}; border: 1px solid ${isDarkMode ? '#666' : '#ccc'};
                border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease;
            ">Cancel</button>
            <button id="saveCreateBookmark" style="
                padding: 10px 20px; background: #4CAF50; color: white;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease;
            ">Create</button>
        </div>
    `;

    if (!document.querySelector('style[data-dialog-animation]')) {
        const style = document.createElement('style');
        style.setAttribute('data-dialog-animation', 'true');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const titleInput = dialog.querySelector('#bookmarkTitleInput');
    const urlInput = dialog.querySelector('#bookmarkUrlInput');
    const descInput = dialog.querySelector('#bookmarkDescInput');
    const cancelBtn = dialog.querySelector('#cancelCreateBookmark');
    const saveBtn = dialog.querySelector('#saveCreateBookmark');

    setTimeout(() => {
        titleInput.focus();
    }, 100);

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = isDarkMode ? '#555' : '#e0e0e0';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = cancelBg;
    });

    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.background = '#45a049';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.background = '#4CAF50';
    });

    [titleInput, urlInput, descInput].forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#4CAF50';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = inputBorder;
        });
    });

    function closeDialog() {
        document.body.removeChild(overlay);
    }

    async function saveBookmark() {
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();
        const newDescription = descInput.value.trim();

        if (!newTitle || !newUrl) {
            if (!newTitle) {
                titleInput.style.borderColor = '#f44336';
                titleInput.focus();
            } else if (!newUrl) {
                urlInput.style.borderColor = '#f44336';
                urlInput.focus();
            }
            return;
        }

        saveBtn.textContent = 'Creating...';
        saveBtn.disabled = true;
        saveBtn.style.background = '#666';

        try {
            const icon = await getFavicon(newUrl);

            const newBookmark = {
                id: generateUUID(),
                title: newTitle,
                url: newUrl,
                description: newDescription,
                icon: icon,
                lastModified: Date.now(),
                deleted: false,
                position: collection.bookmarks.length
            };

            collection.bookmarks.push(newBookmark);
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
            closeDialog();

        } catch (error) {
            console.error('Error creating bookmark:', error);
            saveBtn.textContent = 'Create';
            saveBtn.disabled = false;
            saveBtn.style.background = '#4CAF50';

            urlInput.style.borderColor = '#f44336';
            urlInput.focus();
            handleBookmarkError(error);
        }
    }

    cancelBtn.addEventListener('click', closeDialog);
    saveBtn.addEventListener('click', saveBookmark);

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveBookmark();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog();
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}

// Handle bookmark errors with UI feedback
function handleBookmarkError(error) {
    console.error('Bookmark Error:', error);
    const errorMessage = error.message || 'An unknown error occurred';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `Error: ${errorMessage}`;

    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Edit bookmark dialog
async function editBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const inputBg = isDarkMode ? '#3a3a3a' : 'white';
    const inputBorder = isDarkMode ? '#555' : '#ccc';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex;
        align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: ${dialogBg}; color: ${textColor}; padding: 25px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 400px; max-width: 600px;
        border: 1px solid ${isDarkMode ? '#555' : '#ddd'};
        backdrop-filter: blur(10px); animation: fadeIn 0.2s ease;
    `;

    dialog.innerHTML = `
        <h3 style="color: ${textColor}; margin-top: 0; margin-bottom: 20px; font-size: 18px;">Edit Bookmark</h3>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">Title:</label>
            <input type="text" id="bookmarkTitleInput" value="${bookmark.title || ''}" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor};
                transition: border-color 0.2s ease;
            " placeholder="Enter bookmark title">
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">URL:</label>
            <input type="url" id="bookmarkUrlInput" value="${bookmark.url || ''}" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor};
                transition: border-color 0.2s ease;
            " placeholder="https://example.com">
        </div>
        <div style="margin: 15px 0;">
            <label style="display: block; margin-bottom: 8px; color: ${textColor}; font-weight: 500;">Description (optional):</label>
            <textarea id="bookmarkDescInput" style="
                width: 100%; padding: 12px; border: 2px solid ${inputBorder};
                border-radius: 6px; font-size: 14px; box-sizing: border-box;
                background: ${inputBg}; color: ${textColor}; resize: vertical;
                min-height: 80px; transition: border-color 0.2s ease;
            " placeholder="Enter description (optional)">${bookmark.description || ''}</textarea>
        </div>
        <div style="margin-top: 25px; text-align: right;">
            <button id="cancelEditBookmark" style="
                margin-right: 12px; padding: 10px 20px; background: ${cancelBg};
                color: ${cancelTextColor}; border: 1px solid ${isDarkMode ? '#666' : '#ccc'};
                border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease;
            ">Cancel</button>
            <button id="saveEditBookmark" style="
                padding: 10px 20px; background: #4CAF50; color: white;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease;
            ">Save</button>
        </div>
    `;

    if (!document.querySelector('style[data-dialog-animation]')) {
        const style = document.createElement('style');
        style.setAttribute('data-dialog-animation', 'true');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const titleInput = dialog.querySelector('#bookmarkTitleInput');
    const urlInput = dialog.querySelector('#bookmarkUrlInput');
    const descInput = dialog.querySelector('#bookmarkDescInput');
    const cancelBtn = dialog.querySelector('#cancelEditBookmark');
    const saveBtn = dialog.querySelector('#saveEditBookmark');

    setTimeout(() => {
        titleInput.focus();
        titleInput.select();
    }, 100);

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = isDarkMode ? '#555' : '#e0e0e0';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = cancelBg;
    });

    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.background = '#45a049';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.background = '#4CAF50';
    });

    [titleInput, urlInput, descInput].forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#4CAF50';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = inputBorder;
        });
    });

    function closeDialog() {
        document.body.removeChild(overlay);
    }

    async function saveBookmark() {
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();
        const newDescription = descInput.value.trim();

        if (!newTitle || !newUrl) {
            if (!newTitle) {
                titleInput.style.borderColor = '#f44336';
                titleInput.focus();
            } else if (!newUrl) {
                urlInput.style.borderColor = '#f44336';
                urlInput.focus();
            }
            return;
        }

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        saveBtn.style.background = '#666';

        try {
            let newIcon = bookmark.icon;
            if (newUrl !== bookmark.url) {
                newIcon = await getFavicon(newUrl);
            }

            Object.assign(bookmark, {
                title: newTitle,
                url: newUrl,
                description: newDescription,
                icon: newIcon,
                lastModified: Date.now()
            });

            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
            closeDialog();

        } catch (error) {
            console.error('Error saving bookmark:', error);
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
            saveBtn.style.background = '#4CAF50';

            urlInput.style.borderColor = '#f44336';
            urlInput.focus();
        }
    }

    cancelBtn.addEventListener('click', closeDialog);
    saveBtn.addEventListener('click', saveBookmark);

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveBookmark();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog();
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}

// Delete bookmark with confirmation dialog
function deleteBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    showDeleteConfirmation(
        'Delete Bookmark',
        `Are you sure you want to delete "${bookmark.title}"?`,
        'This action cannot be undone.',
        () => {
            bookmark.deleted = true;
            bookmark.lastModified = Date.now();
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
        }
    );
}

// Generic delete confirmation dialog
function showDeleteConfirmation(title, message, subtitle, onConfirm) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const subtitleColor = isDarkMode ? '#999' : '#666';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex;
        align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: ${dialogBg}; color: ${textColor}; padding: 25px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 350px; max-width: 500px;
        border: 1px solid ${isDarkMode ? '#555' : '#ddd'};
        backdrop-filter: blur(10px); animation: fadeIn 0.2s ease;
        text-align: center;
    `;

    dialog.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="
                width: 60px; height: 60px; margin: 0 auto 15px;
                background: #ff5722; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: 24px; color: white;
            ">&#9888;&#65039;</div>
            <h3 style="color: ${textColor}; margin: 0 0 10px 0; font-size: 18px;">${title}</h3>
            <p style="color: ${textColor}; margin: 0 0 8px 0; font-size: 14px; line-height: 1.4;">${message}</p>
            ${subtitle ? `<p style="color: ${subtitleColor}; margin: 0; font-size: 12px; font-style: italic;">${subtitle}</p>` : ''}
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="cancelDelete" style="
                padding: 10px 20px; background: ${cancelBg};
                color: ${cancelTextColor}; border: 1px solid ${isDarkMode ? '#666' : '#ccc'};
                border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease; min-width: 80px;
            ">Cancel</button>
            <button id="confirmDelete" style="
                padding: 10px 20px; background: #f44336; color: white;
                border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
                transition: all 0.2s ease; min-width: 80px;
            ">Delete</button>
        </div>
    `;

    if (!document.querySelector('style[data-dialog-animation]')) {
        const style = document.createElement('style');
        style.setAttribute('data-dialog-animation', 'true');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancelBtn = dialog.querySelector('#cancelDelete');
    const confirmBtn = dialog.querySelector('#confirmDelete');

    setTimeout(() => {
        cancelBtn.focus();
    }, 100);

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = isDarkMode ? '#555' : '#e0e0e0';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = cancelBg;
    });

    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.background = '#d32f2f';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.background = '#f44336';
    });

    function closeDialog() {
        document.body.removeChild(overlay);
    }

    function handleConfirm() {
        closeDialog();
        if (onConfirm) onConfirm();
    }

    cancelBtn.addEventListener('click', closeDialog);
    confirmBtn.addEventListener('click', handleConfirm);

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (document.activeElement === confirmBtn) {
                handleConfirm();
            } else {
                closeDialog();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog();
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}
