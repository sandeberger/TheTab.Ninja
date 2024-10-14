        let collections = [];
        let draggedItem = null;
        let openInNewTab = false;
        let chromeWindowStates = {};
        let darkMode = false;
        let leftPaneOpen = true;
        let rightPaneOpen = true;

        function importBookmarks() {
            const fileInput = document.getElementById('importFile');
            const file = fileInput.files[0];
          
            if (file) {
              const reader = new FileReader();
              reader.onload = function(e) {
                try {
                  const importedData = JSON.parse(e.target.result);
                  
                  if (importedData.version === 3 && Array.isArray(importedData.lists)) {
                    importedData.lists.forEach(list => {
                      const newCollection = {
                        name: list.title,
                        isOpen: true,
                        bookmarks: []
                      };
          
                      if (Array.isArray(list.cards)) {
                        list.cards.forEach(async card => {
                          newCollection.bookmarks.push({
                            title: card.customTitle || card.title,
                            url: card.url,
                            description: card.customDescription || '',
                            icon: await getFavicon(card.url) // You might want to fetch icons for these bookmarks
                          });
                        });
                      }
          
                      collections.push(newCollection);
                    });
          
                    renderCollections();
                    saveToLocalStorage();
                    alert('Bookmarks imported successfully!');
                  } else {
                    throw new Error('Invalid file format');
                  }
                } catch (error) {
                  console.error('Error importing bookmarks:', error);
                  alert('Error importing bookmarks. Please check the file format.');
                }
              };
              reader.readAsText(file);
            }
        }

        function saveToLocalStorage() {
            try {
                localStorage.setItem('bookmarkManagerData', JSON.stringify({
                    collections: collections,
                    openInNewTab: openInNewTab,
                    chromeWindowStates: chromeWindowStates,
                    darkMode: darkMode,
                    leftPaneOpen: leftPaneOpen,
                    rightPaneOpen: rightPaneOpen
                }));
                console.log('Saved data to localStorage');
            } catch (error) {
                console.error('Error saving to local storage:', error);
            }
        }

        function loadFromLocalStorage() {
            try {
              const data = localStorage.getItem('bookmarkManagerData');
              if (data) {
                const parsedData = JSON.parse(data);
                
                // Handle the new data structure
                if (Array.isArray(parsedData.collections)) {
                  collections = parsedData.collections;
                } else if (Array.isArray(parsedData)) {
                  // Handle the old data structure
                  collections = parsedData;
                } else {
                  collections = [];
                }
          
                openInNewTab = parsedData.openInNewTab || false;
                chromeWindowStates = parsedData.chromeWindowStates || {};
                darkMode = parsedData.darkMode || false;
                leftPaneOpen = parsedData.leftPaneOpen !== undefined ? parsedData.leftPaneOpen : true;
                rightPaneOpen = parsedData.rightPaneOpen !== undefined ? parsedData.rightPaneOpen : true;
                
                document.getElementById('openInNewTab').checked = openInNewTab;
                document.getElementById('darkMode').checked = darkMode;
                applyDarkMode();
                applyPaneStates();
                console.log('Loaded data from localStorage');
              } else {
                // Initialize with default collections if no data in localStorage
                collections = [
                  {
                    name: 'Kodar.Ninja Collection',
                    isOpen: true,
                    bookmarks: [
                        {
                            title: 'ThrustMe!',
                            url: 'https://kodarninja.itch.io/',
                            description: 'A space and underwater exploration game',
                            icon: 'https://kodarninja.itch.io/favicon.ico'
                        },
                        {
                            title: 'TheFile.Ninja',
                            url: 'https://thefile.ninja/',
                            description: 'An innovative file manager for the furure',
                            icon: 'https://thefile.ninja/favicon.ico'
                        }
                    ]

                  }
                ];
              }
            } catch (error) {
              console.error('Error loading from local storage:', error);
              collections = [];
              openInNewTab = false;
              chromeWindowStates = {};
              darkMode = false;
              leftPaneOpen = true;
              rightPaneOpen = true;
            }
        }

        function renderCollections() {
            const collectionsContainer = document.getElementById('collections');
            collectionsContainer.innerHTML = '';

            collections.forEach((collection, collectionIndex) => {
                const collectionElement = document.createElement('div');
                collectionElement.className = 'collection';
                collectionElement.dataset.collectionIndex = collectionIndex;

                const collectionHeader = document.createElement('div');
                collectionHeader.className = 'collection-header';

                const titleArea = document.createElement('div');
                titleArea.className = 'collection-title-area';

                const dragHandle = document.createElement('span');
                dragHandle.className = 'drag-handle';
                dragHandle.textContent = '☰';
                dragHandle.setAttribute('draggable', 'true');

                const collectionTitle = document.createElement('h2');
                collectionTitle.textContent = collection.name;

                const toggleButton = document.createElement('button');
                toggleButton.className = 'toggle-collection';
                toggleButton.textContent = collection.isOpen ? '∨' : '∧';

                titleArea.appendChild(dragHandle);
                titleArea.appendChild(collectionTitle);
                titleArea.appendChild(toggleButton);

                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'collection-actions';

                const launchButton = createButton('launch-collection', '🚀', 'Launch collection as a Chrome-group');
                const addBookmarkButton = createButton('add-bookmark', 'Add Bookmark', 'Manually add a new bookmark');
                const editCollectionButton = createButton('edit-collection', 'Edit', 'Rename collection');
                const moveUpButton = createButton('move-collection', '▲', 'Move collection up');
                const moveDownButton = createButton('move-collection', '▼', 'Move collection down');
                const deleteCollectionButton = createButton('delete-collection', 'Delete', 'Remove collection');

                actionsContainer.appendChild(launchButton);
                actionsContainer.appendChild(addBookmarkButton);
                actionsContainer.appendChild(editCollectionButton);
                actionsContainer.appendChild(moveUpButton);
                actionsContainer.appendChild(moveDownButton);
                actionsContainer.appendChild(deleteCollectionButton);

                collectionHeader.appendChild(titleArea);
                collectionHeader.appendChild(actionsContainer);

                const bookmarksContainer = document.createElement('div');
                bookmarksContainer.className = 'bookmarks';
                bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';

                if (collection.bookmarks.length > 0) {
                    collection.bookmarks.forEach((bookmark, bookmarkIndex) => {
                        const bookmarkElement = createBookmarkElement(bookmark, collectionIndex, bookmarkIndex);
                        bookmarksContainer.appendChild(bookmarkElement);
                    });
                } else {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-collection-message';
                    emptyMessage.textContent = 'Drag bookmarks here';
                    bookmarksContainer.appendChild(emptyMessage);
                }

                bookmarksContainer.addEventListener('dragover', dragOverBookmarkContainer);
                bookmarksContainer.addEventListener('dragleave', dragLeaveBookmarkContainer);
                bookmarksContainer.addEventListener('drop', dropBookmarkContainer);

                collectionElement.appendChild(collectionHeader);
                collectionElement.appendChild(bookmarksContainer);

                launchButton.addEventListener('click', () => launchCollection(collectionIndex));
                toggleButton.addEventListener('click', () => toggleCollection(collectionIndex));
                addBookmarkButton.addEventListener('click', () => addBookmark(collectionIndex));
                editCollectionButton.addEventListener('click', () => editCollection(collectionIndex));
                moveUpButton.addEventListener('click', () => moveCollection(collectionIndex, -1));
                moveDownButton.addEventListener('click', () => moveCollection(collectionIndex, 1));
                deleteCollectionButton.addEventListener('click', () => deleteCollection(collectionIndex));

                dragHandle.addEventListener('dragstart', dragStartCollection);
                dragHandle.addEventListener('dragend', dragEnd);

                collectionElement.addEventListener('dragover', dragOverCollection);
                collectionElement.addEventListener('drop', dropCollection);

                collectionsContainer.appendChild(collectionElement);
            });

            saveToLocalStorage();
        }

        function createButton(className, text, tooltipText) {
            const button = document.createElement('button');
            button.className = `collection-button ${className}`;
            button.textContent = text;
            if (tooltipText) {
                button.title = tooltipText;
            }
            return button;
        }

        function createBookmarkElement(bookmark, collectionIndex, bookmarkIndex) {
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'bookmark';
            bookmarkElement.setAttribute('draggable', 'true');
            bookmarkElement.dataset.collectionIndex = collectionIndex;
            bookmarkElement.dataset.bookmarkIndex = bookmarkIndex;

            const bookmarkIcon = document.createElement('img');
            bookmarkIcon.src = bookmark.icon || 'default-icon.png';
            bookmarkIcon.alt = 'Icon';

            const bookmarkTitle = document.createElement('h3');
            bookmarkTitle.textContent = bookmark.title;
            bookmarkTitle.title = bookmark.title;

            const bookmarkDescription = document.createElement('p');
            bookmarkDescription.textContent = bookmark.description || '';
            bookmarkDescription.title = bookmark.description || '';

            const editIcon = document.createElement('span');
            editIcon.className = 'edit-icon';
            editIcon.textContent = '✏️';

            const deleteIcon = document.createElement('span');
            deleteIcon.className = 'delete-icon';
            deleteIcon.textContent = '🗑️';

            bookmarkElement.appendChild(bookmarkIcon);
            bookmarkElement.appendChild(bookmarkTitle);
            bookmarkElement.appendChild(bookmarkDescription);
            bookmarkElement.appendChild(editIcon);
            bookmarkElement.appendChild(deleteIcon);

            bookmarkElement.addEventListener('dragstart', dragStartBookmark);
            bookmarkElement.addEventListener('dragend', dragEnd);
            bookmarkElement.addEventListener('dragover', dragOverBookmark);
            bookmarkElement.addEventListener('drop', dropBookmark);

            editIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                editBookmark(collectionIndex, bookmarkIndex);
            });

            deleteIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBookmark(collectionIndex, bookmarkIndex);
            });

            bookmarkElement.addEventListener('click', () => openBookmark(collectionIndex, bookmarkIndex));

            return bookmarkElement;
        }

        
        function findFavicon(url, callback) {
            // Se till att URL:en inte har en avslutande snedstreck
            const baseUrl = url.replace(/\/$/, '');
        
            // Definiera potentiella favicon-sökvägar
            const potentialFavicons = [
                `${baseUrl}/favicon.ico`,
                `${baseUrl}/favicon.png`,
                `${baseUrl}/favicon.gif`,
                `${baseUrl}/favicon.jpg`,
                `${baseUrl}/favicon.svg`,
                `${baseUrl}/apple-touch-icon.png`, // För Apple-enheter
                `${baseUrl}/android-chrome-192x192.png`, // För Android-enheter
                `${baseUrl}/mstile-150x150.png`, // För Windows Tiles
            ];
        
            let found = false;
        
            // Funktion för att testa nästa favicon-URL
            function testNext() {
                if (potentialFavicons.length === 0) {
                    callback(null); // Ingen favicon hittades
                    return;
                }
        
                const faviconUrl = potentialFavicons.shift();
                const img = new Image();
        
                img.onload = function() {
                    if (!found) {
                        found = true;
                        callback(faviconUrl); // Favicon hittad
                    }
                };
        
                img.onerror = function() {
                    if (!found) {
                        testNext(); // Testa nästa URL
                    }
                };
        
                img.src = faviconUrl;
            }
        
            // Starta testprocessen
            testNext();
        }
        
        function getFavicon(url) {
            const extensionId = 'ekincidnpifabcbbchcapcahaoeoccgp'; // Ersätt med ditt extension-ID
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(extensionId, { action: 'fetchFavicon', url }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Hantera eventuella fel från sendMessage
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (response && response.faviconUrl) {
                        resolve(response.faviconUrl);
                    } else {
                        reject(new Error('Ingen favicon URL mottogs från extensionen.'));
                    }
                });
            });
        }

        function getFavicon_old2(cardUrl) {
            try {
                findFavicon(cardUrl, function(faviconUrl) {
                    if (faviconUrl) {
                        return faviconUrl;
                    } else {
                        console.log('Ingen favicon hittades i submapp vi försöker igen.');
                        const url = new URL(cardUrl);
        
                        // Construct base URL for the website
                        const baseUrl = url.protocol + "//" + url.hostname;
                        findFavicon(baseUrl, function(faviconUrl) {
                            if (faviconUrl) {
                                return faviconUrl;
                            } else {
                                console.log('Ingen favicon hittades för den angivna URL:en.');
                                console.log(`https://www.google.com/s2/favicons?domain=${cardUrl}&sz=32`)
                                return `https://www.google.com/s2/favicons?domain=${cardUrl}&sz=32`;
                            }
                        });
                    }
                });

                // Parse the given URL
                const url = new URL(cardUrl);
        
                // Construct base URL for the website
                const baseUrl = url.protocol + "//" + url.hostname;
                console.log("Base URL:", baseUrl);
                // Return the assumed favicon location
                return baseUrl + "/favicon.ico";
            } catch (error) {
                console.error("Invalid URL provided:", cardUrl);
                return `https://www.google.com/s2/favicons?domain=${cardUrl}&sz=32`;
            }
        }
    
        async function getFaviconOld(url) {
            try {
                const domain = new URL(url).hostname;
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                const response = await fetch(faviconUrl);
                if (response.ok) {
                    return faviconUrl;
                }
            } catch (error) {
                console.error('Error fetching favicon:', error);
            }
            return 'default-icon.png';
        }

        function addCollection() {
            const name = prompt('Enter collection name:');
            if (name) {
                collections.push({ name, isOpen: true, bookmarks: [] });
                renderCollections();
            }
        }

        function editCollection(index) {
            const newName = prompt('Enter new collection name:', collections[index].name);
            if (newName) {
                collections[index].name = newName;
                renderCollections();
            }
        }

        function toggleCollection(index) {
            collections[index].isOpen = !collections[index].isOpen;
            renderCollections();
        }

        function deleteCollection(index) {
            if (confirm('Are you sure you want to delete this collection?')) {
                collections.splice(index, 1);
                renderCollections();
            }
        }

        async function addBookmark(collectionIndex) {
            const title = prompt('Enter bookmark title:');
            const url = prompt('Enter bookmark URL:');
            const description = prompt('Enter bookmark description:');
            if (title && url) {
                const icon = await getFavicon(url);
                collections[collectionIndex].bookmarks.push({ title, url, description, icon });
                renderCollections();
            }
        }

        async function editBookmark(collectionIndex, bookmarkIndex) {
            const bookmark = collections[collectionIndex].bookmarks[bookmarkIndex];
            const title = prompt('Edit bookmark title:', bookmark.title);
            const url = prompt('Edit bookmark URL:', bookmark.url);
            const description = prompt('Edit bookmark description:', bookmark.description);            
            if (title && url) {
                const icon = await getFavicon(url);
                if (icon === 'default-icon.png' || icon === null || icon === undefined || icon === '') {
                    const icon_url = prompt('Edit favicon URL:', bookmark.icon);
                }
                collections[collectionIndex].bookmarks[bookmarkIndex] = { ...bookmark, title, url, description, icon };
                renderCollections();
            }
        }

        function deleteBookmark(collectionIndex, bookmarkIndex) {
            if (confirm('Are you sure you want to delete this bookmark?')) {
                collections[collectionIndex].bookmarks.splice(bookmarkIndex, 1);
                renderCollections();
            }
        }

        function openBookmark(collectionIndex, bookmarkIndex) {
            const bookmark = collections[collectionIndex].bookmarks[bookmarkIndex];
            if (openInNewTab) {
                window.open(bookmark.url, '_blank');
            } else {
                window.location.href = bookmark.url;
            }
        }

        function launchCollection(index) {
            const collection = collections[index];
            const urls = collection.bookmarks.map(bookmark => bookmark.url);
            const extensionId = 'ekincidnpifabcbbchcapcahaoeoccgp'; // Ersätt med ditt extension-ID
            
            chrome.runtime.sendMessage(extensionId, {
                action: 'launchCollection',
                urls: urls,
                collectionName: collection.name
            }, (response) => {
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

        function moveCollection(index, direction) {
            if ((direction === -1 && index > 0) || (direction === 1 && index < collections.length - 1)) {
                const temp = collections[index];
                collections[index] = collections[index + direction];
                collections[index + direction] = temp;
                renderCollections();
            }
        }

        function dragStartCollection(e) {
            const collectionElement = this.closest('.collection');
            const collectionIndex = parseInt(collectionElement.dataset.collectionIndex);

            draggedItem = {
                type: 'collection',
                element: collectionElement,
                collectionIndex: collectionIndex
            };
            setTimeout(() => collectionElement.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'collection');
        }

        function dragStartBookmark(e) {
            const bookmarkElement = this;
            const collectionIndex = parseInt(bookmarkElement.dataset.collectionIndex);
            const bookmarkIndex = parseInt(bookmarkElement.dataset.bookmarkIndex);

            draggedItem = {
                type: 'bookmark',
                element: bookmarkElement,
                collectionIndex: collectionIndex,
                bookmarkIndex: bookmarkIndex
            };
            setTimeout(() => bookmarkElement.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'bookmark');
        }

        function dragEnd(e) {
            this.classList.remove('dragging');
        }

        function dragOverCollection(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedItem && draggedItem.type === 'collection' && draggedItem.element !== this) {
                const collectionElement = this.closest('.collection');
                const collectionsContainer = collectionElement.parentElement;

                const rect = collectionElement.getBoundingClientRect();
                const midY = rect.top + (rect.height / 2);

                if (e.clientY < midY) {
                    collectionsContainer.insertBefore(draggedItem.element, collectionElement);
                } else {
                    collectionsContainer.insertBefore(draggedItem.element, collectionElement.nextSibling);
                }
            }
        }

        function dropCollection(e) {
            e.preventDefault();
            if (draggedItem && draggedItem.type === 'collection') {
                const collectionsContainer = document.getElementById('collections');
                const collectionElements = Array.from(collectionsContainer.querySelectorAll('.collection'));

                const newCollectionsOrder = collectionElements.map((collectionElement) => {
                    const collectionIndex = parseInt(collectionElement.dataset.collectionIndex);
                    return collections[collectionIndex];
                });

                collections = newCollectionsOrder;

                renderCollections();
            }
            draggedItem = null;
        }

        function dragOverBookmarkContainer(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItem && (draggedItem.type === 'bookmark' || draggedItem.type === 'chromeTab')) {
                this.classList.add('drag-over');
            }
        }

        function dragLeaveBookmarkContainer(e) {
            this.classList.remove('drag-over');
        }

        function dragOverBookmark(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedItem && draggedItem.type === 'bookmark' && draggedItem.element !== this) {
                const bookmarkElement = this;
                const bookmarksContainer = bookmarkElement.parentElement;

                const rect = bookmarkElement.getBoundingClientRect();
                const midY = rect.top + (rect.height / 2);

                if (e.clientY < midY) {
                    bookmarksContainer.insertBefore(draggedItem.element, bookmarkElement);
                } else {
                    bookmarksContainer.insertBefore(draggedItem.element, bookmarkElement.nextSibling);
                }
            }
        }

        function dropBookmark(e) {
            e.preventDefault();
            if (draggedItem && draggedItem.type === 'bookmark') {
                const fromCollectionIndex = draggedItem.collectionIndex;
                const fromBookmarkIndex = draggedItem.bookmarkIndex;

                const toBookmarkElement = this;
                const toCollectionIndex = parseInt(toBookmarkElement.dataset.collectionIndex);

                const bookmarksContainer = toBookmarkElement.parentElement;
                const bookmarkElements = Array.from(bookmarksContainer.querySelectorAll('.bookmark'));
                const toBookmarkIndex = bookmarkElements.indexOf(toBookmarkElement);

                const movedBookmark = collections[fromCollectionIndex].bookmarks.splice(fromBookmarkIndex, 1)[0];

                collections[toCollectionIndex].bookmarks.splice(toBookmarkIndex, 0, movedBookmark);

                renderCollections();
            }
            draggedItem = null;
        }

        function dropBookmarkContainer(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            if (draggedItem) {
                const collectionElement = this.closest('.collection');
                const collectionIndex = parseInt(collectionElement.dataset.collectionIndex);

                if (draggedItem.type === 'chromeTab') {
                    collections[collectionIndex].bookmarks.push({
                        title: draggedItem.data.title,
                        url: draggedItem.data.url,
                        description: '',
                        icon: draggedItem.data.icon || 'default-icon.png'
                    });
                    renderCollections();
                } else if (draggedItem.type === 'bookmark') {
                    const fromCollectionIndex = draggedItem.collectionIndex;
                    const fromBookmarkIndex = draggedItem.bookmarkIndex;
                    const movedBookmark = collections[fromCollectionIndex].bookmarks.splice(fromBookmarkIndex, 1)[0];
                    collections[collectionIndex].bookmarks.push(movedBookmark);
                    renderCollections();
                }
            }
            draggedItem = null;
        }

        function fetchChromeTabs() {
            try {
                const extensionId = "ekincidnpifabcbbchcapcahaoeoccgp";  // Replace with your extension's actual ID
                chrome.runtime.sendMessage(extensionId, { action: "getTabs" }, (response) => {
                    const contentDiv = document.getElementById('content');
                    contentDiv.innerHTML = '';

                    if (response && response.length > 0) {
                        response.forEach((window) => {
                            const windowDiv = document.createElement('div');
                            windowDiv.className = 'window';
                            const windowTitle = document.createElement('div');
                            windowTitle.className = 'window-title';
                            windowTitle.textContent = `Window ID: ${window.windowId} (${window.tabs.length} tabs)`;
                            const tabsList = document.createElement('div');
                            tabsList.className = 'tabs-list';

                            const isOpen = chromeWindowStates[window.windowId] !== undefined ? 
                                chromeWindowStates[window.windowId] : true;
                            tabsList.style.display = isOpen ? 'block' : 'none';

                            window.tabs.forEach((tab) => {
                                const tabDiv = document.createElement('div');
                                tabDiv.className = 'tab';
                                tabDiv.draggable = true;
                                const tabIcon = document.createElement('img');
                                tabIcon.src = tab.favIconUrl || 'https://via.placeholder.com/16';
                                tabDiv.appendChild(tabIcon);
                                const tabTitle = document.createElement('span');
                                tabTitle.className = 'tab-title';
                                tabTitle.textContent = tab.title;
                                tabTitle.title = tab.url;
                                tabDiv.appendChild(tabTitle);
                                tabsList.appendChild(tabDiv);

                                tabDiv.addEventListener('dragstart', (e) => {
                                    draggedItem = {
                                        type: 'chromeTab',
                                        data: {
                                            title: tab.title,
                                            url: tab.url,
                                            icon: tab.favIconUrl
                                        }
                                    };
                                    e.dataTransfer.setData('text/plain', 'chromeTab');
                                });
                            });
                            windowDiv.appendChild(windowTitle);
                            windowDiv.appendChild(tabsList);
                            contentDiv.appendChild(windowDiv);
                            windowTitle.addEventListener('click', () => {
                                const newState = tabsList.style.display === 'none' ? 'block' : 'none';
                                tabsList.style.display = newState;
                                chromeWindowStates[window.windowId] = newState === 'block';
                                saveToLocalStorage();
                            });
                        });
                    } else {
                        console.error('Failed to fetch Chrome tabs');
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
                });
            } catch(error) {
                console.error('Error fetching Chrome tabs:', error);
                const contentDiv = document.getElementById('content');
                contentDiv.innerHTML = '';

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
        }

        function togglePane(paneId) {
            const pane = document.getElementById(paneId);
            const isOpen = !pane.classList.contains('closed');
            pane.classList.toggle('closed');
            
            const content = pane.querySelector('#settings, #content');
            if (content) {
                content.classList.toggle('hidden', isOpen);
            }

            if (paneId === 'leftPane') {
                leftPaneOpen = !isOpen;
            } else if (paneId === 'rightPane') {
                rightPaneOpen = !isOpen;
            }

            saveToLocalStorage();
        }

        function applyPaneStates() {
            const leftPane = document.getElementById('leftPane');
            const rightPane = document.getElementById('rightPane');

            if (!leftPaneOpen) {
                leftPane.classList.add('closed');
                leftPane.querySelector('#settings').classList.add('hidden');
            }

            if (!rightPaneOpen) {
                rightPane.classList.add('closed');
                rightPane.querySelector('#content').classList.add('hidden');
            }
        }

        function applyDarkMode() {
            document.body.classList.toggle('dark-mode', darkMode);
        }

        document.getElementById('addCollection').addEventListener('click', addCollection);
        document.getElementById('openInNewTab').addEventListener('change', (e) => {
            openInNewTab = e.target.checked;
            saveToLocalStorage();
        });

        document.getElementById('darkMode').addEventListener('change', (e) => {
            darkMode = e.target.checked;
            applyDarkMode();
            saveToLocalStorage();
        });

        document.getElementById('importFile').addEventListener('change', importBookmarks);

        loadFromLocalStorage();
        renderCollections();
        fetchChromeTabs();
        setInterval(fetchChromeTabs, 5000);
