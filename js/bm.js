const extId = 'bnmjmbmlfohkaghofdaadenippkgpmab';

let bookmarkManagerData = {
    collections: [],
    openInNewTab: false,
    chromeWindowStates: {},
    darkMode: false,
    leftPaneOpen: true,
    rightPaneOpen: true,
    closeWhenSaveTab: false,
    activeLeftTab: 'spaces',
    zenMode: false,
    enableBetaFeatures: false,
    spaces: ['Everything'], // Default space that cannot be removed
    currentSpace: 'Everything',
    collectionSortOrder: 'userdefined', // New setting for collection sorting
    autoBackup: {
        enabled: true, // Default enabled
        frequency: 'daily', // daily, weekly, disabled
        keepDays: 7, // Keep backups for 7 days
        lastBackup: null, // Timestamp of last backup
        customFolderName: null, // Subfolder name in Downloads (e.g., "MyBackups")
        useCustomFolder: false // Whether to use custom subfolder
    },
    // New multi-provider sync configuration
    syncConfig: {
        activeProvider: 'none', // 'github', 'googledrive', 'none'
        providers: {
            github: {
                username: '',
                repo: '',
                pat: '',
                filepath: 'bookmarks.json'
            },
            googledrive: {
                isAuthenticated: false,
                fileId: null,
                fileName: 'tabninja-bookmarks.json'
            },
            localdrive: {
                directoryName: null,
                fileName: 'tabninja-bookmarks.json',
                hasPermission: false
            }
        }
    },
    // Deprecated - kept for backward compatibility
    githubConfig: {
        username: '',
        repo: '',
        pat: '',
        filepath: 'bookmarks.json'
    }
};

let draggedItem = null;
let placeholder = null;

// Shared SVG fallback icon (used in multiple places)
const FALLBACK_ICON_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzQ1NmJmNiIvPgo8cGF0aCBkPSJNOCAxMkgxNlY4SDE4VjEySDI0VjE0SDI0VjIwSDI0VjI0SDhWMjBIOFYxNEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
const FALLBACK_ICON_GRAY_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzk5OTk5OSIvPgo8cGF0aCBkPSJNMTAgMTBIMjJWMTJIMTBWMTBaTTEwIDE1SDIyVjE3SDEwVjE1Wk0xMCAyMEgyMlYyMkgxMFYyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg==';
const FALLBACK_ICON_TAB_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzY2NjY2NiIvPgo8cGF0aCBkPSJNMTAgMTBIMjJWMTJIMTBWMTBaTTEwIDE1SDIyVjE3SDEwVjE1Wk0xMCAyMEgyMlYyMkgxMFYyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg==';

// Shared background images list (single source of truth)
const BACKGROUND_IMAGES = [
    'images/wallpapers/wp_none.png',
    'images/wallpapers/wp_img01.png',
    'images/wallpapers/wp_img02.png',
    'images/wallpapers/wp_img03.png',
    'images/wallpapers/wp_img05.png',
    'images/wallpapers/wp_img06.png',
    'images/wallpapers/wp_img07.png',
    'images/wallpapers/wp_img08.png',
    'images/wallpapers/wp_img09.png',
    'images/wallpapers/wp_img10.png',
    'images/wallpapers/wp_img11.png',
    'images/wallpapers/wp_img12.png',
    'images/wallpapers/wp_img13.png',
    'images/wallpapers/wp_img14.png',
    'images/wallpapers/wp_img15.png',
    'images/wallpapers/wp_img16.png'
];

// Escape HTML to prevent XSS in template strings
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Shared dialog helper - eliminates duplicated dialog code
function createDialog(contentHtml, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'dialog-box' + (options.wide ? ' wide' : '') + (options.centered ? ' centered' : '');
    dialog.innerHTML = contentHtml;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function close() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    // Escape to close
    const keyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);

    return { overlay, dialog, close };
}

// Function to validate and clean favicon URLs
function getSafeIconUrl(iconUrl) {
    // Return fallback immediately if no URL provided
    if (!iconUrl || iconUrl === 'images/icons/default-icon.png' || iconUrl === 'default-icon.png') {
        return FALLBACK_ICON_SVG;
    }
    
    // If it's already a data URL, return as is
    if (iconUrl.startsWith('data:')) {
        return iconUrl;
    }
    
    // Check for problematic URLs that commonly cause 404s
    const problematicPatterns = [
        'faviconV2?client=SOCIAL',
        't0.gstatic.com/faviconV2',
        't1.gstatic.com/faviconV2',
        't2.gstatic.com/faviconV2',
        't3.gstatic.com/faviconV2',
        'faviconV2?client=SOCIAL&type=FAVICON',
        'fallback_opts=TYPE,SIZE,URL'
    ];
    
    // If URL contains problematic patterns, replace with safe Google favicon service
    for (const pattern of problematicPatterns) {
        if (iconUrl.includes(pattern)) {
            try {
                // Extract domain from the problematic URL
                const urlMatch = iconUrl.match(/url=([^&]+)/);
                if (urlMatch) {
                    const decodedUrl = decodeURIComponent(urlMatch[1]);
                    const domain = new URL(decodedUrl).hostname;
                    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                }
            } catch (e) {
                // If URL parsing fails, return fallback
                return FALLBACK_ICON_SVG;
            }
        }
    }
    
    // Return the original URL if it seems safe
    return iconUrl;
}

// Function to clean up existing problematic favicon URLs in collections
function cleanupFaviconUrls(collections) {
    return collections.map(collection => ({
        ...collection,
        bookmarks: collection.bookmarks.map(bookmark => ({
            ...bookmark,
            icon: getSafeIconUrl(bookmark.icon)
        }))
    }));
}

// Force cleanup of all existing favicon URLs in current data
function forceCleanupAllFaviconUrls() {
    let hasChanges = false;
    
    if (bookmarkManagerData.collections && Array.isArray(bookmarkManagerData.collections)) {
        bookmarkManagerData.collections = bookmarkManagerData.collections.map(collection => {
            const cleanedBookmarks = collection.bookmarks.map(bookmark => {
                const originalIcon = bookmark.icon;
                const cleanedIcon = getSafeIconUrl(bookmark.icon);
                
                if (originalIcon !== cleanedIcon) {
                    hasChanges = true;
                    console.log('Cleaned favicon URL:', originalIcon, '->', cleanedIcon);
                }
                
                return {
                    ...bookmark,
                    icon: cleanedIcon
                };
            });
            
            return {
                ...collection,
                bookmarks: cleanedBookmarks
            };
        });
    }
    
    if (hasChanges) {
        console.log('Favicon URLs cleaned and saved to localStorage');
    }
}

// Global error handling for resource loading
window.addEventListener('error', function(e) {
    // Check if it's an image loading error (favicon, background images, etc.)
    if (e.target && e.target.tagName === 'IMG') {
        // Check if it's a problematic favicon URL
        const src = e.target.src;
        if (src && (src.includes('faviconV2') || src.includes('t2.gstatic.com') || 
                   src.includes('t1.gstatic.com') || src.includes('t3.gstatic.com'))) {
            console.debug('Blocked problematic favicon URL:', src);
        }
        
        // Suppress error from console for image loading failures
        e.preventDefault();
        e.stopPropagation();
        
        // If it doesn't already have a fallback, set a generic one
        if (!e.target.dataset.fallbackApplied) {
            e.target.dataset.fallbackApplied = 'true';
            e.target.src = FALLBACK_ICON_GRAY_SVG;
        }
        return false;
    }
}, true); // Use capture phase to catch before it bubbles

// Suppress unhandled promise rejection warnings for favicon fetches
window.addEventListener('unhandledrejection', function(e) {
    // Check if it's a favicon-related error
    if (e.reason && e.reason.message && 
        (e.reason.message.includes('favicon') || 
         e.reason.message.includes('Favicon fetch timeout') ||
         e.reason.message.includes('icon'))) {
        // Suppress the error from console
        e.preventDefault();
        console.debug('Favicon fetch failed (suppressed):', e.reason.message);
    }
});

// Global applyFilter function for use by both search box and zen search
function applyFilter(searchTerm) {
    const collections = document.querySelectorAll('.collection');
    const isCollectionSearch = searchTerm.startsWith('#');
    const isGlobalSearch = searchTerm.startsWith('%');
    
    // Hantera OR-operatorn
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
        const bookmarksContainer = collectionElement.querySelector('.bookmarks');
        const bookmarkElements = bookmarksContainer.querySelectorAll('.bookmark');
        let showCollection = false;
        let hasVisibleBookmarks = false;

        if (!searchTerm) {
            collectionElement.classList.remove('hidden');
            bookmarkElements.forEach(b => b.classList.remove('hidden'));
            return;
        }

        // Dela upp söktermer baserat på söktyp
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
                const bookmarkMatch = searchTerms.some(term => 
                    bookmarkData.title.toLowerCase().includes(term) ||
                    bookmarkData.url.toLowerCase().includes(term)
                );
                
                bookmarkElement.classList.toggle('hidden', !bookmarkMatch);
                if (bookmarkMatch) hasVisibleBookmarks = true;
            });
            showCollection = hasVisibleBookmarks;
        }

        // Hantera visning av collection
        const bookmarksContainerElement = collectionElement.querySelector('.bookmarks');
        const toggleButton = collectionElement.querySelector('.toggle-collection');
        
        if (showCollection && !collectionElement.classList.contains('is-open')) {
            collectionElement.classList.add('is-open');
            bookmarksContainerElement.style.display = 'flex';
            if (toggleButton) toggleButton.textContent = '∨';
        } else if (!searchTerm) {
            if (collectionData && !collectionData.isOpen) {
                collectionElement.classList.remove('is-open');
                bookmarksContainerElement.style.display = 'none';
                if (toggleButton) toggleButton.textContent = '∧';
            }
        }

        collectionElement.classList.toggle('hidden', !showCollection);
    });
}

// Global funktion för att sätta bakgrundsbild
function setBackground(imageName, type = 'predefined') {
    if (type === 'custom') {
        // För anpassade bilder, imageName är redan en data URL
        document.body.style.backgroundImage = `url("${imageName}")`;
    } else if (imageName === 'images/wallpapers/wp_none.png') {
        document.body.style.backgroundImage = 'none';
    } else {
        // Build path to large version: images/wallpapers/wp_img01.png -> images/wallpapers/large_wp_img01.png
        const lastSlash = imageName.lastIndexOf('/');
        const dir = imageName.substring(0, lastSlash + 1);
        const filename = imageName.substring(lastSlash + 1);
        document.body.style.backgroundImage = `url("${dir}large_${filename}")`;
    }
}

// Ensure it's also available on window for consistency
window.setBackground = setBackground;



window.addEventListener('storage', (event) => {
    if (event.key === 'bookmarkManagerData') {
      // Läs in den nya datan från localStorage
      const newData = loadFromLocalStorage();
      bookmarkManagerData = newData;
      renderCollections();
    }
  });

document.addEventListener('DOMContentLoaded', () => {
    const manifestData = chrome.runtime.getManifest();
    const version = manifestData.version;
    const versionDisplay = document.getElementById('versionDisplay');
    versionDisplay.textContent = `TheTab.ninja version: ${version}`;
    
    const backgroundThumbnailsContainer = document.getElementById('backgroundThumbnails');
    const backgroundImages = BACKGROUND_IMAGES;
    const savedBackground = localStorage.getItem('backgroundImage');
    let selectedThumbnail = null; // Variabel för att hålla reda på den valda miniatyren


    document.getElementById('toggleLeftPane').addEventListener('click', function () {
        togglePane('leftPane');
    });
    
    document.getElementById('toggleRightPane').addEventListener('click', function () {
        togglePane('rightPane');
    });

    setupPaneHoverBehavior();

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
    
    // Close mobile panes when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const leftPane = document.getElementById('leftPane');
            const rightPane = document.getElementById('rightPane');
            
            if (leftPane.classList.contains('open') && 
                !leftPane.contains(e.target) && 
                !mobileLeftToggle.contains(e.target)) {
                leftPane.classList.remove('open');
            }
            
            if (rightPane.classList.contains('open') && 
                !rightPane.contains(e.target) && 
                !mobileRightToggle.contains(e.target)) {
                rightPane.classList.remove('open');
            }
        }
    });


    // Funktion för att markera en miniatyr som vald
    function selectThumbnail(thumbnailElement) {
        // Avmarkera tidigare vald miniatyr (om det finns någon)
        if (selectedThumbnail) {
            selectedThumbnail.classList.remove('selected');
        }
        thumbnailElement.classList.add('selected');
        selectedThumbnail = thumbnailElement;
    }

    // Generera miniatyrer och lägg till event listeners
    backgroundImages.forEach(imageName => {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = `${imageName}`; // Sökväg till miniatyrbilden
        thumbnailImg.alt = `Bakgrundsbild ${imageName}`;
        thumbnailImg.className = 'background-thumbnail';
        thumbnailImg.dataset.imageName = imageName; // Lagra bildnamnet i data-attributet

        // Markera som vald om det är den sparade bakgrunden
        if (savedBackground === imageName) {
            selectThumbnail(thumbnailImg);
            setBackground(imageName); // Sätt bakgrundsbilden direkt vid start
            
            // Uppdatera custom background data för att markera att predefined är aktivt
            const customData = loadCustomBackgrounds();
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            saveCustomBackgrounds(customData);
        }

        thumbnailImg.addEventListener('click', () => {
            const imageName = thumbnailImg.dataset.imageName;
            setBackground(imageName);
            localStorage.setItem('backgroundImage', imageName);
            
            // Uppdatera custom background data för att markera att predefined är aktivt
            const customData = loadCustomBackgrounds();
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            saveCustomBackgrounds(customData);
            
            selectThumbnail(thumbnailImg); // Markera den klickade miniatyren som vald
            
            // Avmarkera alla custom thumbnails
            document.querySelectorAll('.custom-background-thumbnail').forEach(thumb => {
                thumb.classList.remove('selected');
            });
        });

        backgroundThumbnailsContainer.appendChild(thumbnailImg);
    });

    // Om ingen sparad bakgrund, välj den första som standard och markera dess thumbnail
    if (!savedBackground && backgroundImages.length > 0) {
        const defaultImageName = backgroundImages[0];
        const defaultThumbnail = backgroundThumbnailsContainer.querySelector(`.background-thumbnail[data-image-name="${defaultImageName}"]`);
        if (defaultThumbnail) {
            selectThumbnail(defaultThumbnail);
            setBackground(defaultImageName);
            localStorage.setItem('backgroundImage', defaultImageName);
            
            // Sätt även custom background data till predefined
            const customData = loadCustomBackgrounds();
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            saveCustomBackgrounds(customData);
        }
    }

    // Initiera anpassade bakgrundsbilder
    initCustomBackgrounds();
});

// Datastruktur och funktioner för anpassade bakgrundsbilder
function loadCustomBackgrounds() {
    const stored = localStorage.getItem('customBackgroundImages');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing custom backgrounds:', e);
        }
    }
    
    return {
        activeBackground: 'predefined',
        activeImageId: null,
        customImages: {}
    };
}

function saveCustomBackgrounds(data) {
    localStorage.setItem('customBackgroundImages', JSON.stringify(data));
}

function initCustomBackgrounds() {
    const customData = loadCustomBackgrounds();
    renderCustomBackgroundThumbnails();
    
    // Kontrollera om en anpassad bakgrund ska användas
    if (customData.activeBackground === 'custom' && customData.activeImageId) {
        const customImage = customData.customImages[customData.activeImageId];
        if (customImage) {
            setBackground(customImage.dataUrl, 'custom');
        }
    }
}

function renderCustomBackgroundThumbnails() {
    const customData = loadCustomBackgrounds();
    const container = document.getElementById('customBackgroundThumbnails');
    if (!container) return;

    container.innerHTML = '';

    // Lägg till uppladdningsknapp
    const uploadButton = document.createElement('div');
    uploadButton.className = 'custom-upload-button';
    uploadButton.innerHTML = `
        <div class="upload-icon">+</div>
        <div class="upload-text">Add</div>
        <input type="file" id="customBackgroundUpload" accept="image/jpeg,image/png" style="display: none;">
    `;
    
    uploadButton.addEventListener('click', () => {
        document.getElementById('customBackgroundUpload').click();
    });

    const fileInput = uploadButton.querySelector('#customBackgroundUpload');
    fileInput.addEventListener('change', handleCustomBackgroundUpload);
    
    container.appendChild(uploadButton);

    // Rendera befintliga anpassade bilder
    Object.values(customData.customImages).forEach(image => {
        const thumbnail = createCustomThumbnail(image);
        container.appendChild(thumbnail);
    });
}

function createCustomThumbnail(image) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'background-thumbnail custom-thumbnail';
    thumbnail.dataset.imageId = image.id;
    
    thumbnail.innerHTML = `
        <img src="${image.dataUrl}" alt="${image.name}">
        <div class="custom-thumbnail-overlay">
            <button class="remove-custom-bg" title="Ta bort">×</button>
        </div>
    `;

    // Event listener för att sätta bakgrund (klick på bilden)
    thumbnail.addEventListener('click', (e) => {
        if (!e.target.classList.contains('remove-custom-bg')) {

            setCustomBackground(image.id);
        }
    });

    // Event listener för att ta bort bild (klick på X)
    const removeButton = thumbnail.querySelector('.remove-custom-bg');
    if (removeButton) {
        removeButton.addEventListener('click', (e) => {

            e.stopPropagation();
            removeCustomBackground(image.id);
        });
    }

    return thumbnail;
}

async function handleCustomBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validera filtyp
    if (!file.type.match(/image\/(jpeg|png)/)) {
        alert('Endast JPEG och PNG-filer är tillåtna.');
        return;
    }

    // Validera filstorlek (max 5MB innan komprimering)
    if (file.size > 5 * 1024 * 1024) {
        alert('Filen är för stor. Maximal storlek är 5MB.');
        return;
    }

    try {
        // Komprimera och konvertera bilden
        const compressedDataUrl = await compressImage(file);
        
        // Kontrollera slutlig storlek (max 500KB efter komprimering)
        const sizeInBytes = compressedDataUrl.length * 0.75; // approximation för base64
        if (sizeInBytes > 500 * 1024) {
            alert('Bilden är för stor efter komprimering. Prova med en mindre bild.');
            return;
        }

        // Spara den anpassade bakgrundsbilden
        const customData = loadCustomBackgrounds();
        
        // Kontrollera max antal bilder (5)
        if (Object.keys(customData.customImages).length >= 5) {
            alert('Du kan ha max 5 anpassade bakgrundsbilder. Ta bort en befintlig först.');
            return;
        }

        const imageId = 'custom_' + Date.now();
        const imageName = file.name.replace(/\.[^/.]+$/, ''); // Ta bort filändelsen

        customData.customImages[imageId] = {
            id: imageId,
            name: imageName,
            dataUrl: compressedDataUrl,
            uploadDate: Date.now()
        };

        saveCustomBackgrounds(customData);
        renderCustomBackgroundThumbnails();
        
        // Återställ file input
        event.target.value = '';
        

    } catch (error) {
        console.error('Fel vid bilduppladdning:', error);
        alert('Ett fel uppstod vid bilduppladdning. Försök igen.');
    }
}

function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = function() {
            // Beräkna nya dimensioner
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // Rita bilden på canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Konvertera till data URL med komprimering
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
        };

        img.onerror = function() {
            reject(new Error('Kunde inte ladda bilden'));
        };

        // Läs filen som data URL
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error('Kunde inte läsa filen'));
        };
        reader.readAsDataURL(file);
    });
}

function setCustomBackground(imageId) {

    const customData = loadCustomBackgrounds();
    const image = customData.customImages[imageId];
    
    if (!image) {
        console.error('Anpassad bakgrundsbild hittades inte:', imageId);
        return;
    }

    // Uppdatera aktiv bakgrund
    customData.activeBackground = 'custom';
    customData.activeImageId = imageId;
    saveCustomBackgrounds(customData);

    // Sätt bakgrundsbilden
    setBackground(image.dataUrl, 'custom');
    
    // Uppdatera localStorage för kompatibilitet
    localStorage.setItem('backgroundImage', 'custom_' + imageId);
    
    // Markera thumbnail som vald - avmarkera alla först
    document.querySelectorAll('.background-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });
    
    // Markera den valda anpassade thumbnail
    const customThumbnail = document.querySelector(`[data-image-id="${imageId}"]`);
    if (customThumbnail) {
        customThumbnail.classList.add('selected');

    } else {
        console.warn('Kunde inte hitta thumbnail för:', imageId);
    }
}

function removeCustomBackground(imageId) {

    
    if (!confirm('Är du säker på att du vill ta bort denna bakgrundsbild?')) {

        return;
    }

    try {
        const customData = loadCustomBackgrounds();
        
        // Kontrollera att bilden finns
        if (!customData.customImages[imageId]) {
            console.error('Bilden hittades inte:', imageId);
            alert('Bilden kunde inte hittas.');
            return;
        }
        
        // Ta bort bilden
        delete customData.customImages[imageId];

        
        // Om detta var den aktiva bakgrundsbilden, växla till standard
        if (customData.activeBackground === 'custom' && customData.activeImageId === imageId) {
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            
            // Sätt första fördefinierade bakgrundsbilden som standard
            if (BACKGROUND_IMAGES.length > 0) {
                setBackground(BACKGROUND_IMAGES[0]);
                localStorage.setItem('backgroundImage', BACKGROUND_IMAGES[0]);
            }

        }
        
        saveCustomBackgrounds(customData);
        renderCustomBackgroundThumbnails();
        

    } catch (error) {
        console.error('Fel vid borttagning av bakgrundsbild:', error);
        alert('Ett fel uppstod vid borttagning av bakgrundsbilden.');
    }
}


// Funktion för att validera GitHub-konfigurationen
function isGitHubConfigValid() {
    const { username, repo, pat } = bookmarkManagerData.githubConfig;
    return username && repo && pat;
}

// Funktion för att hämta data från GitHub via background.js
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

// Funktion för att pusha till GitHub via background.js
async function pushToGitHub(content) {
    // Skicka data inklusive raderade bokmärken/collections (exkluderar PAT för säkerhet)
    const response = await chrome.runtime.sendMessage({
        action: 'pushToGitHub',
        config: bookmarkManagerData.githubConfig,
        content: content // ✅ Inkludera data (PAT exkluderad via sanitizeDataForSync)
    });
    
    return response.success;
}

// Funktion för att rensa data för säker synkronisering (exkludera PAT och tokens)
function sanitizeDataForSync(data) {
    const sanitized = { ...data };

    // Ta bort PAT från githubConfig om den finns
    if (sanitized.githubConfig) {
        sanitized.githubConfig = {
            ...sanitized.githubConfig,
            pat: undefined
        };
        delete sanitized.githubConfig.pat;
    }

    // Ta bort PAT från syncConfig.providers.github om den finns
    if (sanitized.syncConfig && sanitized.syncConfig.providers) {
        if (sanitized.syncConfig.providers.github) {
            sanitized.syncConfig = {
                ...sanitized.syncConfig,
                providers: {
                    ...sanitized.syncConfig.providers,
                    github: {
                        ...sanitized.syncConfig.providers.github,
                        pat: undefined
                    }
                }
            };
            delete sanitized.syncConfig.providers.github.pat;
        }

        // Strip local-only localdrive state (handle is in IndexedDB, not serializable)
        if (sanitized.syncConfig.providers.localdrive) {
            sanitized.syncConfig = {
                ...sanitized.syncConfig,
                providers: {
                    ...sanitized.syncConfig.providers,
                    localdrive: {
                        ...sanitized.syncConfig.providers.localdrive,
                        hasPermission: false,
                        directoryName: null
                    }
                }
            };
        }
    }

    return sanitized;
}

// Variabel för att spåra om synkronisering pågår
let isSyncing = false; 

// Huvudfunktion för synkronisering
// Multi-provider sync functions
async function handleSyncClick() {
    const activeProvider = bookmarkManagerData.syncConfig.activeProvider;
    
    switch (activeProvider) {
        case 'github':
            await synchronizeWithGitHub();
            break;
        case 'googledrive':
            await synchronizeWithGoogleDrive();
            break;
        case 'localdrive':
            await synchronizeWithLocalDrive();
            break;
        default:
            alert('Please select a sync provider first');
            break;
    }
}

async function synchronizeWithGoogleDrive(retryCount = 0) {
    if (!isGoogleDriveConfigValid()) {
        alert('Please authenticate with Google Drive first');
        return;
    }

    if (isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton.classList.add('syncing');
    isSyncing = true;

    try {
        // Step 1: Fetch data from both sources
        const [localData, rawRemoteData] = await Promise.all([
            loadFromLocalStorage(),
            fetchFromGoogleDrive().catch(async error => {
                if (error.message.includes('Failed to download file') && retryCount === 0) {
                    console.log('Creating initial remote file');
                    const result = await pushToGoogleDrive(sanitizeDataForSync(bookmarkManagerData));
                    if (result.fileId) {
                        bookmarkManagerData.syncConfig.providers.googledrive.fileId = result.fileId;
                        saveToLocalStorage();
                    }
                    return null;
                }
                throw error;
            })
        ]);

        // Step 2: Enrich remote data
        const remoteData = rawRemoteData ? {
            ...rawRemoteData,
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            spaces: (rawRemoteData.spaces || []).map(enrichSpace)
        } : null;

        // Step 3: Validate data structures
        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid remote data structure from Google Drive');
        }

        // Step 4: Merge collections
        const mergedCollections = mergeDatasets(
            localData ? localData.collections || [] : [],
            remoteData ? remoteData.collections || [] : []
        );

        // Step 5: Merge spaces
        const mergedSpaces = mergeSpaces(
            localData ? localData.spaces || [] : [],
            remoteData ? remoteData.spaces || [] : []
        );

        // Step 6: Update local data
        bookmarkManagerData.collections = mergedCollections;
        bookmarkManagerData.spaces = mergedSpaces;
        
        if (remoteData) {
            Object.keys(remoteData).forEach(key => {
                if (key !== 'collections' && key !== 'spaces' && key !== 'syncConfig') {
                    bookmarkManagerData[key] = remoteData[key];
                }
            });
        }

        saveToLocalStorage();

        // Step 7: Push merged data back to Google Drive
        const result = await pushToGoogleDrive(sanitizeDataForSync(bookmarkManagerData));
        if (result.fileId && !bookmarkManagerData.syncConfig.providers.googledrive.fileId) {
            bookmarkManagerData.syncConfig.providers.googledrive.fileId = result.fileId;
            saveToLocalStorage();
        }

        // Step 8: Update UI
        renderCollections();
        renderSpaces();

        console.log('Google Drive sync completed successfully');
        checkAndShowFirstSyncNotification();

    } catch (error) {
        console.error('Google Drive sync error:', error);
        alert(`Google Drive sync failed: ${error.message}`);
    } finally {
        syncButton.classList.remove('syncing');
        isSyncing = false;
    }
}

async function authenticateGoogleDrive() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'authenticateGoogleDrive'
        });
        
        if (response.error) {
            console.error('❌ OAuth2 Error:', response.error);
            
            // Provide helpful error messages
            if (response.error.includes('bad client id')) {
                alert(`❌ OAuth Configuration Error
                
The Google Drive Client ID in manifest.json is not valid.

Steps to fix:
1. Go to Google Cloud Console (console.cloud.google.com)
2. Create OAuth2 Client ID for Chrome Extension
3. Replace "YOUR_OAUTH_CLIENT_ID" in manifest.json
4. Reload the extension

Current error: ${response.error}`);
            } else {
                alert(`Authentication failed: ${response.error}`);
            }
            throw new Error(response.error);
        }
        
        bookmarkManagerData.syncConfig.providers.googledrive.isAuthenticated = true;
        saveToLocalStorage();
        updateGoogleDriveStatus();
        updateSyncButtonVisibility();
        
        alert('Successfully connected to Google Drive!');
    } catch (error) {
        console.error('Google Drive authentication failed:', error);
    }
}

function disconnectGoogleDrive() {
    bookmarkManagerData.syncConfig.providers.googledrive.isAuthenticated = false;
    bookmarkManagerData.syncConfig.providers.googledrive.fileId = null;
    
    // Reset to no sync if Google Drive was active
    if (bookmarkManagerData.syncConfig.activeProvider === 'googledrive') {
        bookmarkManagerData.syncConfig.activeProvider = 'none';
    }
    
    saveToLocalStorage();
    updateGoogleDriveStatus();
    updateSyncProviderUI();
    updateSyncButtonVisibility();
    
    // Clear any cached tokens
    chrome.runtime.sendMessage({ action: 'clearGoogleDriveAuth' }).catch(() => {
        // Token cleanup is best-effort; ignore errors
    });
}

function updateSyncProviderUI() {
    const syncProvider = document.getElementById('syncProvider');
    const githubConfig = document.getElementById('githubConfig');
    const googledriveConfig = document.getElementById('googledriveConfig');
    const localdriveConfig = document.getElementById('localdriveConfig');

    const activeProvider = bookmarkManagerData.syncConfig.activeProvider;

    // Update dropdown value
    if (syncProvider) {
        syncProvider.value = activeProvider;
    }

    // Show/hide provider configs
    githubConfig.style.display = activeProvider === 'github' ? 'block' : 'none';
    googledriveConfig.style.display = activeProvider === 'googledrive' ? 'block' : 'none';
    if (localdriveConfig) {
        localdriveConfig.style.display = activeProvider === 'localdrive' ? 'block' : 'none';
    }

    // Update provider statuses
    updateGoogleDriveStatus();
    updateLocalDriveStatus();
}

function updateGoogleDriveStatus() {
    const statusIndicator = document.querySelector('#googledriveStatus .status-indicator');
    const statusText = document.querySelector('#googledriveStatus .status-text');
    const authBtn = document.getElementById('googledriveAuthBtn');
    const disconnectBtn = document.getElementById('googledriveDisconnectBtn');
    
    const isAuthenticated = bookmarkManagerData.syncConfig.providers.googledrive.isAuthenticated;
    
    if (isAuthenticated) {
        statusIndicator.className = 'status-indicator connected';
        statusText.textContent = 'Connected to Google Drive';
        authBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-block';
    } else {
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Not connected';
        authBtn.style.display = 'inline-block';
        disconnectBtn.style.display = 'none';
    }
}

function isGoogleDriveConfigValid() {
    return bookmarkManagerData.syncConfig.providers.googledrive.isAuthenticated;
}

function updateSyncButtonVisibility() {
    const syncButton = document.getElementById('syncButton');
    if (!syncButton) return;
    const activeProvider = bookmarkManagerData.syncConfig.activeProvider;

    let showButton = false;

    switch (activeProvider) {
        case 'github':
            showButton = isGitHubConfigValid();
            break;
        case 'googledrive':
            showButton = isGoogleDriveConfigValid();
            break;
        case 'localdrive':
            showButton = isLocalDriveConfigValid();
            break;
        default:
            showButton = false;
            break;
    }

    syncButton.style.display = showButton ? 'flex' : 'none';

    // Update tooltip to reflect active provider
    if (showButton) {
        switch (activeProvider) {
            case 'github':
                syncButton.title = 'Sync your collections with GitHub';
                break;
            case 'googledrive':
                syncButton.title = 'Sync your collections with Google Drive';
                break;
            case 'localdrive':
                syncButton.title = 'Sync your collections with Local Drive';
                break;
        }
    }
}

async function fetchFromGoogleDrive() {
    const config = bookmarkManagerData.syncConfig.providers.googledrive;
    
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'fetchFromGoogleDrive',
            config: config
        }, (response) => {
            if (response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response.content);
            }
        });
    });
}

async function pushToGoogleDrive(content) {
    const config = bookmarkManagerData.syncConfig.providers.googledrive;
    
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'pushToGoogleDrive',
            config: config,
            content: content
        }, (response) => {
            if (response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
}

// ============================================================
// Local Drive Sync (File System Access API + IndexedDB)
// ============================================================

// IndexedDB helpers for persisting FileSystemDirectoryHandle
function openTabNinjaDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TabNinjaDB', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles');
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function storeDirectoryHandle(handle) {
    const db = await openTabNinjaDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'localSyncDir');
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function getStoredDirectoryHandle() {
    const db = await openTabNinjaDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readonly');
        const request = tx.objectStore('handles').get('localSyncDir');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function removeStoredDirectoryHandle() {
    const db = await openTabNinjaDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').delete('localSyncDir');
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// Connect / Disconnect
async function connectLocalDrive() {
    try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await storeDirectoryHandle(dirHandle);

        bookmarkManagerData.syncConfig.providers.localdrive.directoryName = dirHandle.name;
        bookmarkManagerData.syncConfig.providers.localdrive.hasPermission = true;
        saveToLocalStorage();

        updateLocalDriveStatus();
        updateSyncButtonVisibility();

        alert(`Connected to folder: ${dirHandle.name}`);
    } catch (error) {
        if (error.name === 'AbortError') {
            // User cancelled the picker – not an error
            return;
        }
        console.error('Error connecting local drive:', error);
        alert(`Failed to connect folder: ${error.message}`);
    }
}

function disconnectLocalDrive() {
    removeStoredDirectoryHandle().catch(() => {});

    bookmarkManagerData.syncConfig.providers.localdrive.directoryName = null;
    bookmarkManagerData.syncConfig.providers.localdrive.hasPermission = false;

    if (bookmarkManagerData.syncConfig.activeProvider === 'localdrive') {
        bookmarkManagerData.syncConfig.activeProvider = 'none';
    }

    saveToLocalStorage();
    updateLocalDriveStatus();
    updateSyncProviderUI();
    updateSyncButtonVisibility();
}

// Status & Validation
function isLocalDriveConfigValid() {
    return bookmarkManagerData.syncConfig.providers.localdrive.hasPermission;
}

function updateLocalDriveStatus() {
    const statusIndicator = document.querySelector('#localdriveStatus .status-indicator');
    const statusText = document.querySelector('#localdriveStatus .status-text');
    const chooseBtn = document.getElementById('localdriveChooseBtn');
    const disconnectBtn = document.getElementById('localdriveDisconnectBtn');

    if (!statusIndicator) return;

    const hasPermission = bookmarkManagerData.syncConfig.providers.localdrive.hasPermission;
    const dirName = bookmarkManagerData.syncConfig.providers.localdrive.directoryName;

    if (hasPermission && dirName) {
        statusIndicator.className = 'status-indicator connected';
        statusText.textContent = `Connected to: ${dirName}`;
        chooseBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-block';
    } else {
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'No folder selected';
        chooseBtn.style.display = 'inline-block';
        disconnectBtn.style.display = 'none';
    }
}

// Fetch / Push via File System Access API
async function fetchFromLocalDrive() {
    const dirHandle = await getStoredDirectoryHandle();
    if (!dirHandle) {
        throw new Error('No directory handle stored. Please reconnect the folder.');
    }

    // Re-request permission (needed after browser restart)
    const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
        // Permission lost – reset state
        bookmarkManagerData.syncConfig.providers.localdrive.hasPermission = false;
        saveToLocalStorage();
        updateLocalDriveStatus();
        updateSyncButtonVisibility();
        throw new Error('Permission to access folder was denied. Please reconnect the folder.');
    }

    const fileName = bookmarkManagerData.syncConfig.providers.localdrive.fileName || 'tabninja-bookmarks.json';

    try {
        const fileHandle = await dirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        if (error.name === 'NotFoundError') {
            // File doesn't exist yet – first sync
            return null;
        }
        throw error;
    }
}

async function pushToLocalDrive(content) {
    const dirHandle = await getStoredDirectoryHandle();
    if (!dirHandle) {
        throw new Error('No directory handle stored. Please reconnect the folder.');
    }

    const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
        bookmarkManagerData.syncConfig.providers.localdrive.hasPermission = false;
        saveToLocalStorage();
        updateLocalDriveStatus();
        updateSyncButtonVisibility();
        throw new Error('Permission to access folder was denied. Please reconnect the folder.');
    }

    const fileName = bookmarkManagerData.syncConfig.providers.localdrive.fileName || 'tabninja-bookmarks.json';
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(content, null, 2));
    await writable.close();
}

// Sync function – mirrors synchronizeWithGoogleDrive pattern
async function synchronizeWithLocalDrive() {
    if (!isLocalDriveConfigValid()) {
        alert('Please choose a folder first');
        return;
    }

    if (isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    const syncButton = document.getElementById('syncButton');
    syncButton.classList.add('syncing');
    isSyncing = true;

    try {
        // Step 1: Fetch data from both sources
        const [localData, rawRemoteData] = await Promise.all([
            loadFromLocalStorage(),
            fetchFromLocalDrive().catch(error => {
                // Re-throw permission and handle errors so they surface to the user
                if (error.message.includes('Permission') || error.message.includes('directory handle')) {
                    throw error;
                }
                // Re-throw JSON parse errors so corrupt files aren't silently overwritten
                if (error instanceof SyntaxError) {
                    throw new Error('The sync file contains invalid JSON. Please check or delete the file and try again.');
                }
                throw error;
            })
        ]);

        // If no remote file yet, push current data and return
        if (rawRemoteData === null) {
            await pushToLocalDrive(sanitizeDataForSync(bookmarkManagerData));
            renderCollections();
            renderSpaces();
            console.log('Local Drive: Initial file created');
            checkAndShowFirstSyncNotification();
            return;
        }

        // Step 2: Enrich remote data
        const remoteData = {
            ...rawRemoteData,
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            spaces: (rawRemoteData.spaces || []).map(enrichSpace)
        };

        // Step 3: Validate data structures
        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }
        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid data structure in local drive file');
        }

        // Step 4: Merge collections
        const mergedCollections = mergeDatasets(
            localData ? localData.collections || [] : [],
            remoteData.collections || []
        );

        // Step 5: Merge spaces
        const mergedSpaces = mergeSpaces(
            localData ? localData.spaces || [] : [],
            remoteData.spaces || []
        );

        // Step 6: Update local data
        bookmarkManagerData.collections = mergedCollections;
        bookmarkManagerData.spaces = mergedSpaces;

        if (remoteData) {
            Object.keys(remoteData).forEach(key => {
                if (key !== 'collections' && key !== 'spaces' && key !== 'syncConfig') {
                    bookmarkManagerData[key] = remoteData[key];
                }
            });
        }

        saveToLocalStorage();

        // Step 7: Push merged data back to file
        await pushToLocalDrive(sanitizeDataForSync(bookmarkManagerData));

        // Step 8: Update UI
        renderCollections();
        renderSpaces();

        console.log('Local Drive sync completed successfully');
        checkAndShowFirstSyncNotification();

    } catch (error) {
        console.error('Local Drive sync error:', error);
        alert(`Local Drive sync failed: ${error.message}`);
    } finally {
        syncButton.classList.remove('syncing');
        isSyncing = false;
    }
}

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
    syncButton.classList.add('syncing');
    isSyncing = true;

    try {

        
        // Steg 1: Hämta data från båda källor
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

        // Steg 2: Enricha remote-data
        const remoteData = rawRemoteData ? {
            ...rawRemoteData, // Behåll alla andra egenskaper
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            // NY RAD: Applicera enrichSpace på fjärrdatan för spaces
            spaces: (rawRemoteData.spaces || []).map(enrichSpace)
        } : null;

        // Steg 3: Validera datastrukturer
        if (localData && !validateDataStructure(localData)) {
            throw new Error('Invalid local data structure');
        }

        if (remoteData && !validateDataStructure(remoteData)) {
            throw new Error('Invalid remote data structure from GitHub');
        }

        // Steg 4: Merga collections
        const mergedCollections = mergeDatasets(
            (localData?.collections || []),
            (remoteData?.collections || [])
        );

        // Steg 4.5: Merga spaces
        const localSpaces = (localData?.spaces || ['Everything']).map(enrichSpace); // Bra att enricha lokal data också
        const remoteSpaces = remoteData?.spaces || [{ name: 'Everything', deleted: false, lastModified: Date.now() }];
        const mergedSpaces = mergeSpaces(localSpaces, remoteSpaces);
        
        // Säkerställ att currentSpace fortfarande är giltig
        const localCurrentSpace = localData?.currentSpace || 'Everything';
        const remoteCurrentSpace = remoteData?.currentSpace || 'Everything';
        let mergedCurrentSpace = localCurrentSpace;
        
        // Om lokalt currentSpace inte finns i merged spaces, använd remote eller fallback
        const spaceNames = mergedSpaces.filter(space => !space.deleted).map(space => space.name);
        if (!spaceNames.includes(localCurrentSpace)) {
            if (spaceNames.includes(remoteCurrentSpace)) {
                mergedCurrentSpace = remoteCurrentSpace;
            } else {
                mergedCurrentSpace = 'Everything';
            }
        }

        // Steg 5: Uppdatera lokalt tillstånd
        const newData = {
            ...bookmarkManagerData,
            collections: mergedCollections,
            spaces: mergedSpaces,
            currentSpace: mergedCurrentSpace,
            lastSynced: Date.now()
        };

        // Steg 6: Pusha mergad data till GitHub (inkl. raderade, exkl. PAT)
        await pushToGitHub(sanitizeDataForSync({
            ...newData,
            collections: newData.collections.map(collection => ({
                ...collection,
                bookmarks: collection.bookmarks
            }))
        }));

        // Steg 7: Uppdatera UI och lagring
        bookmarkManagerData = newData;
        renderCollections();
        renderSpaces(); // Uppdatera spaces-listan efter sync
        saveToLocalStorage();

        // Check if this is the first successful sync and show notification
        checkAndShowFirstSyncNotification();

    } catch (error) {
        console.error('Sync error:', error);
        alert(`Sync failed: ${error.message}`);
        if (retryCount < 2) {
            console.log(`Retrying sync (attempt ${retryCount + 1})`);
            await synchronizeWithGitHub(retryCount + 1);
        }
    } finally {
        isSyncing = false;
        syncButton.classList.remove('syncing');
    }
}

// Hjälpfunktioner för merge-logik
function mergeDatasets(localCollections, remoteCollections) {
    const allCollections = [...localCollections, ...remoteCollections];
    const collectionMap = new Map();
    const globalBookmarks = new Map();

    // Bygg en global index av alla bokmärken
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

    // Bygg upp collections baserat på senaste versionen
    for (const collection of allCollections) {
        const existing = collectionMap.get(collection.id) || {
            ...collection,
            bookmarks: [],
            lastModified: 0
        };

        // Uppdatera collection metadata - använd senaste versionen baserat på lastModified
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
            bookmarks: [] // Töm temporärt
        });
    }

    // Lägg till bokmärken i rätt collection
    globalBookmarks.forEach((bookmark, id) => {
        const collection = collectionMap.get(bookmark.parentCollection);
        if (collection) {
            collection.bookmarks.push(bookmark);
        }
    });

    // Sortera och returnera (behåll soft-deleted bookmarks för sync-kompatibilitet)
    return Array.from(collectionMap.values()).map(collection => ({
        ...collection,
        bookmarks: collection.bookmarks
            .sort((a, b) => a.position - b.position)
    }));
}


function mergeSpaces(localSpaces, remoteSpaces) {
    // Normalize spaces to object format if they're still strings (migration)
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
    
    // Merge spaces like collections - using the same logic as mergeDatasets
    const allSpaces = [...normalizedLocal, ...normalizedRemote];
    const spaceMap = new Map();
    
    // Build up spaces based on latest version
    for (const space of allSpaces) {
        const existing = spaceMap.get(space.name) || {
            name: space.name,
            deleted: false,
            lastModified: 0
        };
        
        // Use the version with the latest timestamp
        const shouldUseIncoming = space.lastModified > existing.lastModified;
        spaceMap.set(space.name, {
            name: shouldUseIncoming ? space.name : existing.name,
            deleted: shouldUseIncoming ? space.deleted : existing.deleted,
            lastModified: Math.max(existing.lastModified, space.lastModified)
        });
    }
    
    // Convert back to array and ensure Everything is always present and not deleted
    const mergedSpaces = Array.from(spaceMap.values());
    
    // Ensure Everything always exists and is not deleted
    let everythingSpace = mergedSpaces.find(s => s.name === 'Everything');
    if (!everythingSpace) {
        everythingSpace = {
            name: 'Everything',
            deleted: false,
            lastModified: Date.now()
        };
        mergedSpaces.push(everythingSpace);
    } else {
        everythingSpace.deleted = false; // Everything can never be deleted
    }
    
    return mergedSpaces;
}

function validateDataStructure(data) {
    if (!data || data === null) return true;
    if (data.collections && !Array.isArray(data.collections)) return false;

    return data.collections.every(c => {
        if (typeof c.id !== 'string') return false;
        if (c.bookmarks && !Array.isArray(c.bookmarks)) return false;
        return true;
    });
}


// Hjälpfunktion för att generera unika ID:n
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Hjälpfunktion för att generera unikt kollektionsnamn
function generateUniqueCollectionName(baseName) {
    if (!baseName || baseName.trim() === '') {
        baseName = 'New Collection';
    }
    
    let name = baseName;
    let counter = 2;
    
    // Kontrollera om namnet redan existerar
    while (bookmarkManagerData.collections.some(c => !c.deleted && c.name.toLowerCase() === name.toLowerCase())) {
        name = `${baseName}${counter}`;
        counter++;
    }
    
    return name;
}

// Funktion för att skapa en ny Collection från Tab Group
function createCollectionFromTabGroup(tabGroupData) {
    const selfUrl = chrome.runtime.getURL("bm.html");
    
    // Säkerställ att vi har valid data
    if (!tabGroupData) {
        throw new Error('No tab group data provided');
    }
    
    // Generera unikt namn baserat på datatyp
    let baseName;
    if (tabGroupData.title && tabGroupData.title.trim() !== '') {
        // Chrome Group data har title-fältet
        baseName = tabGroupData.title;
    } else if (tabGroupData.windowId) {
        // Chrome Window data har windowId men inte title
        baseName = `Chrome Window ${tabGroupData.windowId}`;
    } else {
        baseName = 'Tab Group';
    }
    const collectionName = generateUniqueCollectionName(baseName);
    
    // Skapa nya bokmärken från tabbar
    const bookmarks = [];
    if (tabGroupData.tabs && Array.isArray(tabGroupData.tabs)) {
        let position = 0;
        tabGroupData.tabs.forEach((tab) => {
            // Hoppa över vår egen sida och ogiltiga URLs
            if (tab.url === selfUrl || !tab.url || tab.url.startsWith('chrome://')) return;
            
            const newBookmark = {
                id: generateUUID(),
                title: tab.title || 'Untitled',
                url: tab.url,
                description: "",
                icon: tab.favIconUrl || 'images/icons/default-icon.png',
                lastModified: Date.now(),
                deleted: false,
                position: position++
            };
            bookmarks.push(newBookmark);
        });
    }
    
    // Kontrollera att vi faktiskt har några bokmärken att lägga till
    if (bookmarks.length === 0) {
        console.warn('No valid tabs found in tab group, creating empty collection');
    }
    
    // Skapa ny Collection
    const newCollection = {
        id: generateUUID(),
        name: collectionName,
        isOpen: true,
        lastModified: Date.now(),
        deleted: false,
        position: bookmarkManagerData.collections.length,
        bookmarks: bookmarks
    };
    
    // Lägg till i collections array
    bookmarkManagerData.collections.push(newCollection);
    
    // Stäng tabbar om inställningen är aktiv
    if (bookmarkManagerData.closeWhenSaveTab && tabGroupData.tabs) {
        tabGroupData.tabs.forEach(tab => {
            if ((tab.tabId || tab.id) && tab.url !== selfUrl && tab.url && !tab.url.startsWith('chrome://')) {
                try {
                    chrome.tabs.remove(tab.tabId || tab.id);
                } catch (error) {
                    console.warn('Could not close tab:', error);
                }
            }
        });
    }
    
    return newCollection;
}

function exportBookmarks() {
    const sanitizedData = sanitizeDataForSync(bookmarkManagerData);
    const dataStr = JSON.stringify(sanitizedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookmarks.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function deleteAllCollections() {
    if (confirm('Are you sure you want to reset ALL collections to default? This cannot be undone.')) {
        // Ersätt med standardcollection
        const defaultCollection = enrichCollection(createDefaultCollection());
        bookmarkManagerData.collections = [defaultCollection];
        saveToLocalStorage();
        renderCollections();
        alert('All collections have been reset to default.');
    }
}

function importBookmarksFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validera att filen har rätt struktur
            if (!importedData || !Array.isArray(importedData.collections)) {
                throw new Error('Invalid file format: Missing collections array');
            }

            // Berika importerade data
            const enrichedCollections = importedData.collections.map(enrichCollection);

            // Ersätt befintliga collections med de importerade
            bookmarkManagerData.collections = enrichedCollections;

            // Uppdatera UI och spara till localStorage
            renderCollections();
            saveToLocalStorage();
            alert('Bookmarks imported successfully!');
        } catch (error) {
            console.error('Error importing bookmarks:', error);
            alert(`Error importing bookmarks: ${error.message}`);
        }
    };
    reader.onerror = function(error) {
        console.error('File read error:', error);
        alert('Error reading file. Please try again.');
    };
    reader.readAsText(file);
}

async function importTobyBookmarks() {
    const fileInput = document.getElementById('importTobyFile');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const importedData = JSON.parse(e.target.result);
                let listsToImport = [];

                // Kontrollera version och extrahera listorna därefter
                if (importedData.version === 3 && Array.isArray(importedData.lists)) {
                    // Hantera Version 3 format
                    listsToImport = importedData.lists;
                    console.log("Importing Toby v3 format");
                } else if (importedData.version === 4 && Array.isArray(importedData.groups)) {
                    // Hantera Version 4 format
                    // Slå samman listor från alla grupper
                    importedData.groups.forEach(group => {
                        if (Array.isArray(group.lists)) {
                            listsToImport = listsToImport.concat(group.lists);
                        }
                    });
                    console.log("Importing Toby v4 format");
                } else {
                    throw new Error('Unsupported file format or version. Expected Toby v3 or v4.');
                }

                if (listsToImport.length === 0 && importedData.version === 4) {
                    // Detta kan hända om version 4 filen har en tom groups-array eller grupper utan listor
                    console.warn("No lists found to import from Toby v4 file.");
                    // Du kan välja att visa ett meddelande till användaren här eller bara fortsätta utan att importera något
                }

                // Om inga listor hittades alls efter att ha försökt båda versionerna
                if (listsToImport.length === 0) {
                    alert('No bookmark lists found in the imported file.');
                    return;
                }

                const newCollections = await Promise.all(listsToImport.map(async list => {
                    // Säkerställ att 'list' faktiskt är ett objekt och har en 'title'
                    if (typeof list !== 'object' || list === null || typeof list.title === 'undefined') {
                        console.warn('Skipping invalid list item:', list);
                        return null; // Hoppa över ogiltiga listobjekt
                    }

                    const newCollection = enrichCollection({
                        name: list.title,
                        isOpen: true, // Du kan bestämma defaultvärde här
                        bookmarks: []
                    });

                    if (Array.isArray(list.cards)) {
                        newCollection.bookmarks = await Promise.all(list.cards.map(async card => {
                            // Säkerställ att 'card' är ett objekt
                            if (typeof card !== 'object' || card === null) {
                                console.warn('Skipping invalid card item:', card);
                                return null; // Hoppa över ogiltiga kortobjekt
                            }
                            return enrichBookmark({
                                title: card.customTitle || card.title || 'Untitled Bookmark', // Fallback för titel
                                url: card.url || '#', // Fallback för URL
                                description: card.customDescription || card.description || '',
                                icon: card.favIconUrl || (card.url ? await getFavicon(card.url) : 'images/icons/default-icon.png') // Använd befintlig favIconUrl om den finns
                            });
                        }));
                        newCollection.bookmarks = newCollection.bookmarks.filter(b => b !== null); // Ta bort null-värden (från överhoppade kort)
                    }
                    return newCollection;
                }));

                const validNewCollections = newCollections.filter(c => c !== null); // Ta bort null-värden (från överhoppade listor)

                if (validNewCollections.length > 0) {
                    bookmarkManagerData.collections = [
                        ...bookmarkManagerData.collections,
                        ...validNewCollections
                    ];

                    renderCollections();
                    saveToLocalStorage();
                    alert('Bookmarks imported successfully!');
                } else if (listsToImport.length > 0) { // Om det fanns listor men inga blev giltiga samlingar
                    alert('Bookmarks imported, but some items might have been invalid and were skipped.');
                } else {
                    // Detta fall bör redan ha hanterats ovan, men som en extra säkerhet
                    alert('No valid bookmarks found to import.');
                }

            } catch (error) {
                console.error('Error importing bookmarks:', error);
                alert('Error importing bookmarks. Please check the file format. Details: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}



// Uppdaterad funktion för att spara till localStorage och chrome.storage
function saveToLocalStorage() {
    try {
        localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));
        // Also sync to chrome.storage.local so popup and background can access it
        chrome.storage.local.set({ bookmarkManagerData: bookmarkManagerData });
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Listen for data updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'bookmarkDataUpdated' && message.data) {
        bookmarkManagerData = message.data;
        localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));
        renderCollections();
    }
});

// First Sync Success Notification Functions
function checkAndShowFirstSyncNotification() {
    // Check if the notification has already been shown
    const hasShownFirstSync = localStorage.getItem('hasShownFirstSyncNotification');
    
    if (!hasShownFirstSync) {
        // Mark as shown to prevent future displays
        localStorage.setItem('hasShownFirstSyncNotification', 'true');
        
        // Show the notification after a short delay
        setTimeout(() => {
            showFirstSyncNotification();
        }, 1000);
    }
}

function showFirstSyncNotification() {
    const notification = document.getElementById('firstSyncNotification');
    if (!notification) return;
    
    // Show the notification with animation
    notification.classList.add('show');
    
    // Allow clicking to dismiss early
    const handleClick = () => {
        hideFirstSyncNotification();
        notification.removeEventListener('click', handleClick);
    };
    notification.addEventListener('click', handleClick);
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
        hideFirstSyncNotification();
        notification.removeEventListener('click', handleClick);
    }, 10000);
}

function hideFirstSyncNotification() {
    const notification = document.getElementById('firstSyncNotification');
    if (!notification) return;
    
    // Hide with animation
    notification.classList.remove('show');
}

// Uppdaterad funktion för att ladda från localStorage
// Migration function to convert old githubConfig to new syncConfig structure
function migrateSyncConfig(data) {
    // Ensure localdrive provider exists for users who migrated before it was added
    if (data.syncConfig && data.syncConfig.providers && !data.syncConfig.providers.localdrive) {
        data.syncConfig.providers.localdrive = {
            directoryName: null,
            fileName: 'tabninja-bookmarks.json',
            hasPermission: false
        };
    }

    // If data already has syncConfig, no further migration needed
    if (data.syncConfig) {
        return data;
    }
    
    // If data has githubConfig with actual values, migrate to syncConfig
    if (data.githubConfig && (data.githubConfig.username || data.githubConfig.repo || data.githubConfig.pat)) {
        console.log('Migrating old githubConfig to new syncConfig structure');
        
        data.syncConfig = {
            activeProvider: 'github', // Set GitHub as active if they had config
            providers: {
                github: {
                    username: data.githubConfig.username || '',
                    repo: data.githubConfig.repo || '',
                    pat: data.githubConfig.pat || '',
                    filepath: data.githubConfig.filepath || 'bookmarks.json'
                },
                googledrive: {
                    isAuthenticated: false,
                    fileId: null,
                    fileName: 'tabninja-bookmarks.json'
                },
                localdrive: {
                    directoryName: null,
                    fileName: 'tabninja-bookmarks.json',
                    hasPermission: false
                }
            }
        };

        // Keep githubConfig for backward compatibility but mark it as migrated
        data.githubConfig._migrated = true;
        
        console.log('Migration completed successfully');
    } else {
        // No existing GitHub config, create empty syncConfig
        data.syncConfig = {
            activeProvider: 'none',
            providers: {
                github: {
                    username: '',
                    repo: '',
                    pat: '',
                    filepath: 'bookmarks.json'
                },
                googledrive: {
                    isAuthenticated: false,
                    fileId: null,
                    fileName: 'tabninja-bookmarks.json'
                },
                localdrive: {
                    directoryName: null,
                    fileName: 'tabninja-bookmarks.json',
                    hasPermission: false
                }
            }
        };
    }

    return data;
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('bookmarkManagerData');
        let parsedData = null;

        if (data) {
            parsedData = JSON.parse(data);
            
            // Enrich collections and bookmarks
            if (Array.isArray(parsedData.collections)) {
                parsedData.collections = parsedData.collections.map(enrichCollection);
                
                // Clean up problematic favicon URLs
                parsedData.collections = cleanupFaviconUrls(parsedData.collections);
            }

            const existingPat = bookmarkManagerData.githubConfig?.pat;

            // Migrate old githubConfig to new syncConfig structure
            parsedData = migrateSyncConfig(parsedData);
            
            // Hantera den nya datastrukturen
            bookmarkManagerData = {
                ...bookmarkManagerData,  // Behåll standardvärden
                ...parsedData,  // Överskrid med sparade värden
                githubConfig: {
                    ...bookmarkManagerData.githubConfig, // Behåll standard githubConfig
                    ...(parsedData.githubConfig || {}),  // Överskrid med sparade githubConfig värden
                    pat: existingPat || parsedData.githubConfig?.pat || '' // Behåll existerande PAT
                }
            };

            // Säkerställ att leftPaneOpen och rightPaneOpen har värden
            bookmarkManagerData.leftPaneOpen = parsedData.leftPaneOpen !== undefined ? parsedData.leftPaneOpen : true;
            bookmarkManagerData.rightPaneOpen = parsedData.rightPaneOpen !== undefined ? parsedData.rightPaneOpen : true;
        }else{
            // Lägg till standardcollection vid första start
            const defaultCollection = enrichCollection(createDefaultCollection());
            bookmarkManagerData.collections.push(defaultCollection);
            saveToLocalStorage(); 
        }
        
        document.getElementById('openInNewTab').checked = bookmarkManagerData.openInNewTab;
        document.getElementById('closeWhenSaveTab').checked = bookmarkManagerData.closeWhenSaveTab;
        document.getElementById('darkMode').checked = bookmarkManagerData.darkMode;
        document.getElementById('collectionSortOrder').value = bookmarkManagerData.collectionSortOrder || 'userdefined';
        
        if (bookmarkManagerData.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
            
        applyPaneStates();
        console.log('Loaded data from localStorage');
        return parsedData || bookmarkManagerData;
    } catch (error) {
        console.error('Error loading from local storage:', error);
        // Vid fel, använd standardvärden
        bookmarkManagerData = {
            collections: [],
            openInNewTab: false,
            chromeWindowStates: {},
            darkMode: false,
            leftPaneOpen: true,
            rightPaneOpen: true,
            githubConfig: {
                username: '',
                repo: '',
                pat: '',
                filepath: 'bookmarks.json'
            }
        };
        return bookmarkManagerData;
    }
}

        const svgInbox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309.197 309.197" xml:space="preserve" style="width:1em;height:1em" fill="currentColor"><path d="M120.808 10.036h67.581v100.671h54.559l-88.351 100.88-88.351-100.882h54.562z"/><path d="M260.002 176.673v73.289H49.195v-73.289H0v122.488h309.197V176.673z"/></svg>`;

        const svgOutbox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309.197 309.197" xml:space="preserve" style="width:1em;height:1em" fill="currentColor"><path d="M120.808 211.587h67.581V110.916h54.559l-88.351-100.88-88.351 100.882h54.562z"/><path d="M260.002 176.673v73.289H49.195v-73.289H0v122.488h309.197V176.673z"/></svg>`;

        // Uppdaterad renderCollections funktion
        // Function to get sort comparator based on current sort order
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
                        return bTime - aTime; // newest first (higher timestamp first)
                    };
                case 'modified-old':
                    return (a, b) => {
                        const aTime = Number(a.lastModified) || 0;
                        const bTime = Number(b.lastModified) || 0;
                        return aTime - bTime; // oldest first (lower timestamp first)
                    };
                case 'userdefined':
                default:
                    return (a, b) => (a.position || 0) - (b.position || 0);
            }
        }

        function renderCollections() {
            const collectionsContainer = document.getElementById('collections');
            collectionsContainer.innerHTML = '';

            const currentSpace = bookmarkManagerData.currentSpace || 'Everything';
            
            const sortedCollections = bookmarkManagerData.collections
                .filter(c => !c.deleted)
                .filter(c => {
                    // Om Everything är valt, visa alla collections
                    if (currentSpace === 'Everything') {
                        return true;
                    }
                    // Annars visa bara collections som tillhör det valda spacet
                    return c.spaces && Array.isArray(c.spaces) && c.spaces.includes(currentSpace);
                })
                .sort(getSortComparator());

            sortedCollections.forEach((collection) => {
                const collectionElement = document.createElement('div');
                collectionElement.className = `collection ${collection.isOpen ? 'is-open' : ''}`;
                collectionElement.setAttribute('draggable', bookmarkManagerData.collectionSortOrder === 'userdefined');
                collectionElement.dataset.collectionId = collection.id;

                // Collection Header
                const header = document.createElement('div');
                header.className = 'collection-header';

                // Drag Handle - only show for userdefined sorting
                const dragHandle = document.createElement('span');
                dragHandle.className = 'drag-handle';
                dragHandle.textContent = '☰';
                dragHandle.setAttribute('draggable', bookmarkManagerData.collectionSortOrder === 'userdefined');
                if (bookmarkManagerData.collectionSortOrder !== 'userdefined') {
                    dragHandle.style.display = 'none';
                }

                // Title Area
                const titleArea = document.createElement('div');
                titleArea.className = 'collection-title-area';
                
                // Collection Title
                const title = document.createElement('h2');
                title.textContent = collection.name;
                
                // Spaces indicator
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

                // Toggle Button
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'toggle-collection';
                toggleBtn.textContent = collection.isOpen ? '∨' : '∧';

                // Action Buttons
                const actions = document.createElement('div');
                actions.className = 'collection-actions';

                // Skapa alla knappar
                const buttons = [
                    { className: 'launch-collection', text: '🚀', title: 'Open bookmarks in a Chrome group', action: () => launchCollection(collection.id) },
                    { className: 'openall-collection', icon: 'outbox', title: 'Open bookmarks in this collection', action: () => launchAllTabs(collection.id) },
                    { className: 'fetch-alltabs', icon: 'inbox', title: 'Get all Chrome tabs', action: () => fetchAllTabs(collection.id) },
                    { className: 'add-bookmark', text: '+', title: 'Create bookmark', action: () => addBookmark(collection.id) },
                    { className: 'edit-collection', text: '✏️', title: 'Edit collection', action: () => editCollection(collection.id) },
                    { className: 'edit-spaces', text: '🏷️', title: 'Manage spaces for this collection', action: () => editCollectionSpaces(collection.id) },
                    ...(bookmarkManagerData.collectionSortOrder === 'userdefined' ? [
                        { className: 'move-collection', text: '▲', title: 'Move collection up', action: () => moveCollection(collection.id, -1) },
                        { className: 'move-collection', text: '▼', title: 'Move collection down', action: () => moveCollection(collection.id, 1) }
                    ] : []),
                    { className: 'delete-collection', text: '🗑️', title: 'Delete collection', action: () => deleteCollection(collection.id) }
                ];

                buttons.forEach(btnConfig => {
                    const btn = document.createElement('button');
                    btn.className = `collection-button ${btnConfig.className}`;
                    btn.title = btnConfig.title;
                    btn.addEventListener('click', btnConfig.action);
                  
                    // Kolla om vi ska använda SVG i stället för text
                    if (btnConfig.icon === 'inbox') {
                      btn.innerHTML = svgInbox;
                    } else if (btnConfig.icon === 'outbox') {
                      btn.innerHTML = svgOutbox;
                    } else {
                      // Annars använd vanlig text
                      btn.textContent = btnConfig.text;
                    }
                  
                    actions.appendChild(btn);
                  });

                // Bygg ihop headern
                titleArea.appendChild(dragHandle);
                titleArea.appendChild(title);
                titleArea.appendChild(toggleBtn);
                header.appendChild(titleArea);
                header.appendChild(actions);

                // Bookmarks Container
                const bookmarksContainer = document.createElement('div');
                bookmarksContainer.className = 'bookmarks';
                bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';

                // Lägg till bokmärken (filtrera bort raderade)
                collection.bookmarks
                    .filter(b => !b.deleted)
                    .sort((a, b) => a.position - b.position)
                    .forEach(bookmark => {
                        const bookmarkElement = createBookmarkElement(bookmark, collection.id);
                        bookmarksContainer.appendChild(bookmarkElement);
                    });

                // Lägg till "dra hit" om tom
                if (bookmarksContainer.children.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'empty-collection-message';
                    emptyMsg.textContent = 'Drag bookmarks here';
                    emptyMsg.dataset.collectionId = collection.id;
                    addEmptyMessageListeners(emptyMsg);
                    bookmarksContainer.appendChild(emptyMsg);
                }

                // Event Listeners
                dragHandle.addEventListener('dragstart', dragStartCollection);
                dragHandle.addEventListener('dragend', dragEnd);
                toggleBtn.addEventListener('click', () => toggleCollection(collection.id));

                // Sammansätt allt
                collectionElement.appendChild(header);
                collectionElement.appendChild(bookmarksContainer);
                collectionsContainer.appendChild(collectionElement);

                // Draghanterare för hela collection
                addCollectionDragListeners(collectionElement);

                // Reapply search filter after rendering
                const searchBox = document.getElementById('searchBox');
                if (searchBox && searchBox.value) {
                    applyFilter(searchBox.value);
                }
            });
        }

        function launchAllTabs(collectionId) {
            const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
            if (collection) {
              // Filtrera bort raderade bokmärken och samla URL:er
              const urls = collection.bookmarks
                .filter(bookmark => !bookmark.deleted)
                .map(bookmark => bookmark.url);
          
              // Öppna varje URL i en ny flik
              urls.forEach(url => {
                chrome.tabs.create({ url: url });
              });
            } else {
              console.error(`Collection med id ${collectionId} hittades inte.`);
            }
        }



        async function fetchAllTabs(collectionId) {
            try {
                // Hämta den fullständiga URL:en för bm.html (vår egen sida)
                const selfUrl = chrome.runtime.getURL("bm.html");
                chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
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
                            // Hoppa över vår egen sida så vi inte stänger den
                            if (tab.url === selfUrl) return;
                            
                            const newBookmark = {
                                id: generateUUID(),
                                title: tab.title,
                                url: tab.url,
                                description: "",
                                icon: tab.favIconUrl || "images/icons/default-icon.png",
                                lastModified: Date.now(),
                                deleted: false,
                                position: collection.bookmarks.length
                            };
                            collection.bookmarks.push(newBookmark);
                            // Stäng fliken om inställningen är aktiv, och om det inte är vår egen sida
                            if (bookmarkManagerData.closeWhenSaveTab && (tab.tabId || tab.id)) {
                                chrome.tabs.remove(tab.tabId || tab.id);
                            }
                        });
                        collection.lastModified = Date.now();
                        renderCollections();
                        saveToLocalStorage();
                    }
                });
            } catch (error) {
                console.error("Error in fetchAllTabs:", error);
            }
        }

        // Uppdaterad createBookmarkElement funktion
        function createBookmarkElement(bookmark, collectionId) {
            if (bookmark.deleted) return null; // ❌ Filtrera här
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'bookmark';
            bookmarkElement.setAttribute('draggable', 'true');
            bookmarkElement.dataset.collectionId = collectionId;
            bookmarkElement.dataset.bookmarkId = bookmark.id;

            const bookmarkIcon = document.createElement('img');
            
            // Validate and clean favicon URL before using it
            let iconSrc = getSafeIconUrl(bookmark.icon);
            bookmarkIcon.src = iconSrc;
            bookmarkIcon.alt = 'Icon';
            
            // Handle favicon loading errors gracefully
            bookmarkIcon.onerror = function() {
                // Fallback to a generic icon if loading fails
                this.src = FALLBACK_ICON_SVG;
                this.onerror = null; // Prevent infinite loops
            };

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
            bookmarkElement.addEventListener('dragover', (e) => { e.preventDefault(); });

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

        function getFavicon(url) {
    
            return new Promise((resolve, reject) => {
                // Timeout för att undvika långa väntetider
                const timeout = setTimeout(() => {
                    reject(new Error('Favicon fetch timeout'));
                }, 5000);
                
                chrome.runtime.sendMessage({ action: 'fetchFavicon', url }, (response) => {
                    clearTimeout(timeout);
                    
                    if (chrome.runtime.lastError) {
                        // Fallback to embedded SVG icon on communication error
                        const fallbackUrl = FALLBACK_ICON_SVG;
                        resolve(fallbackUrl);
                        return;
                    }
                    
                    if (response && response.faviconUrl) {
                        resolve(response.faviconUrl);
                    } else {
                        // Fallback to embedded SVG icon if no response
                        const fallbackUrl = FALLBACK_ICON_SVG;
                        resolve(fallbackUrl);
                    }
                });
            });
        }

// Helper function to enrich a single bookmark
function enrichBookmark(bookmark) {
    return {
        ...bookmark,
        parentCollection: bookmark.parentCollection, // Behåll befintligt om det finns
        id: bookmark.id || generateUUID(),
        lastModified: bookmark.lastModified || Date.now(),
        deleted: bookmark.deleted || false
    };
}


// Helper function to enrich a single collection
function enrichCollection(collection) {
    return {
        id: generateUUID(),
        name: 'New Collection',
        isOpen: true,
        lastModified: Date.now(),
        deleted: false,
        position: 0,
        bookmarks: [],
        spaces: ['Everything'], // Default: tillhör Everything space (bakåtkompatibilitet)
        ...collection,
        // Ensure lastModified is a valid number (for old collections that might not have it)
        lastModified: collection.lastModified && Number(collection.lastModified) ? Number(collection.lastModified) : Date.now(),
        bookmarks: (collection.bookmarks || []).map(enrichBookmark),
        // Säkerställ att spaces alltid är en array och innehåller minst Everything
        spaces: Array.isArray(collection.spaces) && collection.spaces.length > 0 
            ? collection.spaces 
            : ['Everything']
    };
}

// HELPER FUNCTION TO ENRICH A SINGLE SPACE
function enrichSpace(space) {
    // Om spacet är en gammal sträng, konvertera det först
    if (typeof space === 'string') {
        return {
            name: space,
            deleted: false,
            lastModified: Date.now()
        };
    }

    // Säkerställ att alla fält finns och har rätt typ
    return {
        name: space.name || 'Unnamed Space', // Fallback
        deleted: space.deleted || false,
        // KRITISK RAD: Garantera att lastModified är ett tal
        lastModified: space.lastModified && Number(space.lastModified) ? Number(space.lastModified) : Date.now()
    };
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Månader är 0-indexerade
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Uppdaterad funktion för att lägga till en ny samling        
function addCollection() {
    const today = new Date();
    const name = prompt('Enter collection name:',formatDate(today));
    if (name) {
        bookmarkManagerData.collections.forEach(c => {
            c.position++;
            c.lastModified = Date.now();
        });

        const newCollection = {
            id: generateUUID(),
            name: name,
            isOpen: true,
            lastModified: Date.now(),
            deleted: false,
            position: 0, //bookmarkManagerData.collections.length,
            bookmarks: []
        };
        bookmarkManagerData.collections.push(newCollection);
        renderCollections();
        saveToLocalStorage();
    }
}

function editCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    const { dialog, close } = createDialog(`
        <h3>Edit Collection Name</h3>
        <div class="dialog-field">
            <label class="dialog-label">Collection Name:</label>
            <input type="text" class="dialog-input" id="collectionNameInput" value="${escapeHtml(collection.name)}" placeholder="Enter collection name">
        </div>
        <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-cancel" id="cancelEdit">Cancel</button>
            <button class="dialog-btn dialog-btn-save" id="saveEdit">Save</button>
        </div>
    `);

    const input = dialog.querySelector('#collectionNameInput');
    setTimeout(() => { input.focus(); input.select(); }, 100);

    function save() {
        const newName = input.value.trim();
        if (newName && newName !== collection.name) {
            collection.name = newName;
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
        }
        close();
    }

    dialog.querySelector('#cancelEdit').addEventListener('click', close);
    dialog.querySelector('#saveEdit').addEventListener('click', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
    });
}

function editCollectionSpaces(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;

    migrateSpacesToObjectFormat();
    const availableSpaces = bookmarkManagerData.spaces
        .filter(space => !space.deleted)
        .map(space => space.name) || ['Everything'];
    const currentSpaces = collection.spaces || ['Everything'];

    const spacesHtml = availableSpaces.map(space => {
        const checked = currentSpaces.includes(space) ? 'checked' : '';
        const disabled = space === 'Everything' ? 'disabled' : '';
        return `
            <label class="dialog-checkbox-label">
                <input type="checkbox" value="${escapeHtml(space)}" ${checked} ${disabled}>
                ${escapeHtml(space)}${space === 'Everything' ? ' (always included)' : ''}
            </label>
        `;
    }).join('');

    const { dialog, close } = createDialog(`
        <h3>Select Spaces for "${escapeHtml(collection.name)}"</h3>
        <div class="dialog-field">${spacesHtml}</div>
        <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-cancel" id="cancelSpaces">Cancel</button>
            <button class="dialog-btn dialog-btn-save" id="saveSpaces">Save</button>
        </div>
    `);

    dialog.querySelector('#saveSpaces').addEventListener('click', () => {
        const selectedSpaces = Array.from(dialog.querySelectorAll('input[type="checkbox"]'))
            .filter(cb => cb.checked).map(cb => cb.value);
        if (!selectedSpaces.includes('Everything')) selectedSpaces.unshift('Everything');
        collection.spaces = selectedSpaces;
        collection.lastModified = Date.now();
        saveToLocalStorage();
        renderCollections();
        close();
    });
    dialog.querySelector('#cancelSpaces').addEventListener('click', close);
}

// Uppdaterad toggleCollection funktion
function toggleCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        collection.isOpen = !collection.isOpen;
        collection.lastModified = Date.now();
        
        // Hitta collection-elementet och uppdatera dess klasser
        const collectionElement = document.querySelector(`.collection[data-collection-id="${collectionId}"]`);
        if (collectionElement) {
            collectionElement.classList.toggle('is-open', collection.isOpen);
            
            // Uppdatera bookmarks container display
            const bookmarksContainer = collectionElement.querySelector('.bookmarks');
            if (bookmarksContainer) {
                bookmarksContainer.style.display = collection.isOpen ? 'flex' : 'none';
            }
        }
        
        saveToLocalStorage();
    }
}

// Uppdaterad funktion för att ta bort en samling
function deleteCollection(collectionId) {
    if (confirm('Are you sure you want to delete this collection?')) {
        const collectionIndex = bookmarkManagerData.collections.findIndex(c => c.id === collectionId);
        if (collectionIndex !== -1) {
            bookmarkManagerData.collections[collectionIndex].deleted = true;
            bookmarkManagerData.collections[collectionIndex].lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
        }
    }
}

// Shared bookmark dialog for both create and edit
async function showBookmarkDialog(collection, bookmark) {
    const isEdit = !!bookmark;
    const { dialog, close } = createDialog(`
        <h3>${isEdit ? 'Edit Bookmark' : 'Create Bookmark'}</h3>
        <div class="dialog-field">
            <label class="dialog-label">Title:</label>
            <input type="text" class="dialog-input" id="bookmarkTitleInput" value="${isEdit ? escapeHtml(bookmark.title) : ''}" placeholder="Enter bookmark title">
        </div>
        <div class="dialog-field">
            <label class="dialog-label">URL:</label>
            <input type="url" class="dialog-input" id="bookmarkUrlInput" value="${isEdit ? escapeHtml(bookmark.url) : 'https://'}" placeholder="https://example.com">
        </div>
        <div class="dialog-field">
            <label class="dialog-label">Description (optional):</label>
            <textarea class="dialog-textarea" id="bookmarkDescInput" placeholder="Enter description (optional)">${isEdit ? escapeHtml(bookmark.description) : ''}</textarea>
        </div>
        <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-cancel" id="cancelBtn">Cancel</button>
            <button class="dialog-btn dialog-btn-save" id="saveBtn">${isEdit ? 'Save' : 'Create'}</button>
        </div>
    `, { wide: true });

    const titleInput = dialog.querySelector('#bookmarkTitleInput');
    const urlInput = dialog.querySelector('#bookmarkUrlInput');
    const saveBtn = dialog.querySelector('#saveBtn');
    setTimeout(() => { titleInput.focus(); if (isEdit) titleInput.select(); }, 100);

    async function save() {
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();
        const newDescription = dialog.querySelector('#bookmarkDescInput').value.trim();

        if (!newTitle || !newUrl) {
            if (!newTitle) { titleInput.classList.add('dialog-error'); titleInput.focus(); }
            else { urlInput.classList.add('dialog-error'); urlInput.focus(); }
            return;
        }

        saveBtn.textContent = isEdit ? 'Saving...' : 'Creating...';
        saveBtn.disabled = true;

        try {
            let icon = isEdit ? bookmark.icon : null;
            if (!isEdit || newUrl !== bookmark.url) icon = await getFavicon(newUrl);

            if (isEdit) {
                Object.assign(bookmark, { title: newTitle, url: newUrl, description: newDescription, icon, lastModified: Date.now() });
            } else {
                collection.bookmarks.push({
                    id: generateUUID(), title: newTitle, url: newUrl, description: newDescription,
                    icon, lastModified: Date.now(), deleted: false, position: collection.bookmarks.length
                });
            }
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
            close();
        } catch (error) {
            console.error('Error saving bookmark:', error);
            saveBtn.textContent = isEdit ? 'Save' : 'Create';
            saveBtn.disabled = false;
            urlInput.classList.add('dialog-error');
            urlInput.focus();
            if (!isEdit) handleBookmarkError(error);
        }
    }

    dialog.querySelector('#cancelBtn').addEventListener('click', close);
    saveBtn.addEventListener('click', save);
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    });
}

async function addBookmark(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    await showBookmarkDialog(collection, null);
}

function handleBookmarkError(error) {
    console.error('Bookmark Error:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    
    // Visa felmeddelande i UI
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `Error: ${errorMessage}`;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

async function editBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;
    await showBookmarkDialog(collection, bookmark);
}

// Uppdaterad funktion för att ta bort ett bokmärke
function deleteBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;
    
    // Skapa bekräftelsedialog
    showDeleteConfirmation(
        'Delete Bookmark',
        `Are you sure you want to delete "${bookmark.title}"?`,
        'This action cannot be undone.',
        () => {
            // Bekräftat - ta bort bookmark
            bookmark.deleted = true;
            bookmark.lastModified = Date.now();
            collection.lastModified = Date.now();
            saveToLocalStorage();
            renderCollections();
        }
    );
}

function showDeleteConfirmation(title, message, subtitle, onConfirm) {
    const { dialog, close } = createDialog(`
        <div style="margin-bottom: 20px;">
            <div class="dialog-delete-icon">&#9888;&#65039;</div>
            <h3>${escapeHtml(title)}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.4;">${escapeHtml(message)}</p>
            ${subtitle ? `<p style="color: #666; margin: 0; font-size: 12px; font-style: italic;">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="dialog-btn dialog-btn-cancel" id="cancelDelete">Cancel</button>
            <button class="dialog-btn dialog-btn-danger" id="confirmDelete">Delete</button>
        </div>
    `, { centered: true });

    const cancelBtn = dialog.querySelector('#cancelDelete');
    const confirmBtn = dialog.querySelector('#confirmDelete');
    setTimeout(() => cancelBtn.focus(), 100);

    cancelBtn.addEventListener('click', close);
    confirmBtn.addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });
}

// Uppdaterad openBookmark funktion
function openBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
            // Block dangerous URL protocols
            try {
                const urlObj = new URL(bookmark.url);
                if (['javascript:', 'data:', 'vbscript:'].includes(urlObj.protocol)) {
                    console.warn('Blocked navigation to unsafe URL protocol:', urlObj.protocol);
                    return;
                }
            } catch (e) {
                console.warn('Invalid bookmark URL:', bookmark.url);
                return;
            }
            if (bookmarkManagerData.openInNewTab) {
                window.open(bookmark.url, '_blank');
            } else {
                window.location.href = bookmark.url;
            }
        }
    }
}

function launchCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const urls = collection.bookmarks.filter(b => !b.deleted).map(bookmark => bookmark.url).filter(url => {
            try {
                const urlObj = new URL(url);
                return !['javascript:', 'data:', 'vbscript:'].includes(urlObj.protocol);
            } catch (e) { return false; }
        });

    
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

function moveCollection(collectionId, direction) {
    const currentIndex = bookmarkManagerData.collections.findIndex(c => c.id === collectionId);
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < bookmarkManagerData.collections.length) {
        const [movedCollection] = bookmarkManagerData.collections.splice(currentIndex, 1);
        bookmarkManagerData.collections.splice(newIndex, 0, movedCollection);
        
        // Uppdatera positioner och timestamps för alla påverkade collections
        bookmarkManagerData.collections.forEach((collection, index) => {
            collection.position = index;
            collection.lastModified = Date.now();
        });
        
        renderCollections();
        saveToLocalStorage();
    }
}


// Uppdaterad dragStartCollection funktion
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
        e.dataTransfer.effectAllowed = 'copyMove'; // Tillåt både copy och move för spaces drop
        e.dataTransfer.setData('text/plain', collectionId);
        e.dataTransfer.setData('application/json', JSON.stringify({type: 'collection', id: collectionId}));
        
        // Visa drop-zones för spaces om spaces-fliken är aktiv

        showSpaceDropZones();
    } else {
        console.warn('Collection element not found for drag start');
    }
}

// Uppdaterad dragStartBookmark funktion
function dragStartBookmark(e) {

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
  
// Uppdaterad dragEnd funktion
function dragEnd(e) {
    if (draggedItem && draggedItem.element) {
        draggedItem.element.classList.remove('dragging');
    }
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }

    // Dölj space drop-zones
    hideSpaceDropZones();

    draggedItem = null;

}

// Uppdaterad dragOverCollection funktion
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

    // Find closest collection by absolute distance to center
    let closestCollection = null;
    let closestDistance = Infinity;
    let shouldPlaceBefore = true;

    collections.forEach(collection => {
        const rect = collection.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(mouseY - centerY);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestCollection = collection;
            shouldPlaceBefore = mouseY < centerY;
        }
    });

    // Reuse existing placeholder or create new one
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }

    // insertBefore moves the placeholder if it already exists in the DOM
    if (!closestCollection) {
        collectionsContainer.appendChild(placeholder);
    } else if (shouldPlaceBefore) {
        collectionsContainer.insertBefore(placeholder, closestCollection);
    } else {
        collectionsContainer.insertBefore(placeholder, closestCollection.nextSibling);
    }
}

function dropCollection(e) {
    e.preventDefault();

    if (!draggedItem || draggedItem.type !== 'collection') return;

    const droppedCollectionId = draggedItem.collectionId;
    const collections = bookmarkManagerData.collections;
    const droppedIndex = collections.findIndex(c => c.id === droppedCollectionId);

    if (droppedIndex === -1) return;

    const [movedCollection] = collections.splice(droppedIndex, 1);

    if (placeholder && placeholder.parentNode) {
        // Find the next visible collection after the placeholder in the DOM
        let nextCollectionId = null;
        let foundPlaceholder = false;
        for (const child of placeholder.parentNode.children) {
            if (child === placeholder) { foundPlaceholder = true; continue; }
            if (foundPlaceholder && child.classList.contains('collection')) {
                nextCollectionId = child.dataset.collectionId;
                break;
            }
        }

        if (nextCollectionId) {
            // Insert before the next collection in data array
            const nextIndex = collections.findIndex(c => c.id === nextCollectionId);
            if (nextIndex !== -1) {
                collections.splice(nextIndex, 0, movedCollection);
            } else {
                collections.push(movedCollection);
            }
        } else {
            // No collection after placeholder — append to end
            collections.push(movedCollection);
        }
        movedCollection.lastModified = Date.now();

        placeholder.parentNode.removeChild(placeholder);
    } else {
        collections.push(movedCollection);
        movedCollection.lastModified = Date.now();
    }

    placeholder = null;
    draggedItem = null;

    collections.forEach((collection, index) => {
        collection.position = index;
    });

    saveToLocalStorage();
    renderCollections();
}

// Lägg även till denna hjälpfunktion för att förhindra drop på empty message
function addEmptyMessageListeners(emptyMessage) {
    emptyMessage.addEventListener('dragover', (e) => {
        // Förhindra drop på empty message för collections
        if (draggedItem && draggedItem.type === 'collection') {
            e.preventDefault();
            e.stopPropagation();
            emptyMessage.style.backgroundColor = '#ffebee'; // Visuell indikation att drop inte är tillåtet
        }
    });

    emptyMessage.addEventListener('dragleave', (e) => {
        emptyMessage.style.backgroundColor = ''; // Återställ style
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

function dragOverBookmarkContainer(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedItem) return;

    if (draggedItem.type === 'chromeTab' ||
        draggedItem.type === 'chromeWindow' ||
        draggedItem.type === 'chromeTabGroup') {
        this.classList.add('drag-over');
        return;
    }

    if (draggedItem.type !== 'bookmark') return;

    this.classList.add('drag-over');

    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }

    const container = this;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Get all visible bookmark children (exclude placeholder and the dragged element)
    const children = Array.from(container.children).filter(
        c => c !== placeholder && !c.classList.contains('dragging') && c.classList.contains('bookmark')
    );

    // Find insertion point: in a flex-wrap grid, compare row-by-row then column
    let refNode = null;
    for (const child of children) {
        const rect = child.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;

        // If mouse is above this row's midpoint, insert before this child
        if (mouseY < midY) {
            // Same row: also check horizontal position
            if (mouseY >= rect.top) {
                if (mouseX < midX) {
                    refNode = child;
                    break;
                }
                // Mouse is to the right of this child, continue to next
            } else {
                // Mouse is above this child's row entirely
                refNode = child;
                break;
            }
        }
    }

    // refNode is null → append at end, otherwise insert before refNode
    // Only move DOM if position actually changed
    if (refNode) {
        if (placeholder.nextSibling !== refNode || placeholder.parentElement !== container) {
            container.insertBefore(placeholder, refNode);
        }
    } else {
        if (placeholder.parentElement !== container || container.lastElementChild !== placeholder) {
            container.appendChild(placeholder);
        }
    }
}

function dragLeaveBookmarkContainer(e) {
    this.classList.remove('drag-over');
}

// Uppdaterad dragOverBookmark med stabil placeholder-hantering
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
    if (targetBookmark === draggedItem.element) return;

    const rect = targetBookmark.getBoundingClientRect();
    const isBefore = (e.clientY - rect.top) < rect.height / 2;
    const container = targetBookmark.parentElement;

    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }
    placeholder.style.height = `${rect.height}px`;

    // Determine the desired reference node
    const refNode = isBefore ? targetBookmark : targetBookmark.nextSibling;

    // Only move the placeholder if it's not already in the correct position
    // This prevents layout thrashing that causes the jumping behavior
    if (placeholder.nextSibling !== refNode || placeholder.parentElement !== container) {
        container.insertBefore(placeholder, refNode);
    }
}

function dropBookmark(e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent dropBookmarkContainer from also firing

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

    // Count non-dragging bookmarks before the placeholder to get correct data index
    let dropIndex = toCollection.bookmarks.length;
    if (placeholder && placeholder.parentNode === container) {
        dropIndex = 0;
        for (const child of container.children) {
            if (child === placeholder) break;
            if (child.classList.contains('bookmark') && !child.classList.contains('dragging')) dropIndex++;
        }
    }
    dropIndex = Math.max(0, Math.min(dropIndex, toCollection.bookmarks.length));

    movedBookmark.lastModified = Date.now();
    toCollection.bookmarks.splice(dropIndex, 0, movedBookmark);
    toCollection.lastModified = Date.now();
    if (fromCollection !== toCollection) fromCollection.lastModified = Date.now();

    toCollection.bookmarks.forEach((b, i) => { b.position = i; });
    if (fromCollection !== toCollection) {
        fromCollection.bookmarks.forEach((b, i) => { b.position = i; });
    }

    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }

    renderCollections();
    saveToLocalStorage();
    draggedItem = null;
}


// Uppdaterad dropBookmarkContainer funktion
function dropBookmarkContainer(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    // Hämta vår egen sida för att kunna jämföra
    const selfUrl = chrome.runtime.getURL("bm.html");
    
    if (draggedItem) {
        const collectionElement = this.closest('.collection');
        const collectionId = collectionElement.dataset.collectionId;
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
        if (!collection) return;
        
        if (draggedItem.type === 'chromeTabGroup') {
            // Importera tabbar från Chrome Group som bokmärken
            let tabsArray = draggedItem.data.tabs || [];
            tabsArray.forEach(tab => {
                // Hoppa över om fliken är vår egen sida
                if (tab.url === selfUrl) return;
                const newBookmark = {
                    id: generateUUID(),
                    title: tab.title,
                    url: tab.url,
                    description: "",
                    icon: tab.favIconUrl || 'images/icons/default-icon.png',
                    lastModified: Date.now(),
                    deleted: false,
                    position: collection.bookmarks.length
                };
                collection.bookmarks.push(newBookmark);
            });
            collection.lastModified = Date.now();
            // Stäng alla tabbar i gruppen om inställningen är aktiv och om de inte är vår egen sida
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
            // Importera alla tabbar från Chrome Window som bokmärken
            let tabsArray = draggedItem.data.tabs || [];
            tabsArray.forEach(tab => {
                // Hoppa över om fliken är vår egen sida
                if (tab.url === selfUrl) return;
                const newBookmark = {
                    id: generateUUID(),
                    title: tab.title,
                    url: tab.url,
                    description: "",
                    icon: tab.favIconUrl || 'images/icons/default-icon.png',
                    lastModified: Date.now(),
                    deleted: false,
                    position: collection.bookmarks.length
                };
                collection.bookmarks.push(newBookmark);
            });
            collection.lastModified = Date.now();
            // Stäng alla tabbar i fönstret om inställningen är aktiv och om de inte är vår egen sida
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
            // Om den enskilda tabben är vår egen sida, hoppa över att lägga till bokmärke och stängning
            if (draggedItem.data.url === selfUrl) {
                draggedItem = null;
                return;
            }
            const newBookmark = {
                id: generateUUID(),
                title: draggedItem.data.title,
                url: draggedItem.data.url,
                description: '',
                icon: draggedItem.data.icon || 'images/icons/default-icon.png',
                lastModified: Date.now(),
                deleted: false,
                position: collection.bookmarks.length
            };
            collection.bookmarks.push(newBookmark);
            collection.lastModified = Date.now();
            // Stäng tabben om inställningen är aktiv och om den inte är vår egen sida
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

                    // Calculate drop index from placeholder position
                    let dropIndex = collection.bookmarks.length;
                    const bookmarksContainer = this;
                    if (placeholder && placeholder.parentNode === bookmarksContainer) {
                        dropIndex = 0;
                        for (const child of bookmarksContainer.children) {
                            if (child === placeholder) break;
                            if (child.classList.contains('bookmark') && !child.classList.contains('dragging')) dropIndex++;
                        }
                    }
                    dropIndex = Math.max(0, Math.min(dropIndex, collection.bookmarks.length));

                    collection.bookmarks.splice(dropIndex, 0, movedBookmark);
                    movedBookmark.lastModified = Date.now();
                    fromCollection.lastModified = Date.now();
                    collection.lastModified = Date.now();

                    collection.bookmarks.forEach((b, i) => { b.position = i; });
                    if (fromCollection !== collection) {
                        fromCollection.bookmarks.forEach((b, i) => { b.position = i; });
                    }
                }
            }
        }
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
            placeholder = null;
        }
        saveToLocalStorage();
        renderCollections();
    }
    draggedItem = null;
}

// Ny funktion för att skapa Chrome-flik element
function createChromeTabElement(tab, windowId) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab';
    tabDiv.draggable = true;
    tabDiv.dataset.windowId = windowId;
    tabDiv.dataset.tabId = tab.id;

    const tabIcon = document.createElement('img');
    
    // Validate and clean favicon URL before using it
    let iconSrc = getSafeIconUrl(tab.favIconUrl);
    tabIcon.src = iconSrc;
    
    // Handle tab favicon loading errors gracefully
    tabIcon.onerror = function() {
        // Fallback to a generic tab icon if loading fails
        this.src = FALLBACK_ICON_TAB_SVG;
        this.onerror = null; // Prevent infinite loops
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

// Funktion för att visa reservinnehåll
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

// Debounced wrapper to avoid rapid re-renders from multiple tab events
let fetchChromeTabsTimer = null;
function fetchChromeTabsDebounced() {
    if (fetchChromeTabsTimer) clearTimeout(fetchChromeTabsTimer);
    fetchChromeTabsTimer = setTimeout(fetchChromeTabs, 300);
}

// Uppdaterad fetchChromeTabs funktion
async function fetchChromeTabs() {
    try {
        chrome.runtime.sendMessage({ action: "getTabs" }, (response) => {
            const contentDiv = document.getElementById('content');
            contentDiv.innerHTML = '';

            if (response && response.length > 0) {
                response.forEach((windowData) => {
                    const windowDiv = document.createElement('div');
                    windowDiv.className = 'window';

                    windowDiv.setAttribute('draggable', true);
                    windowDiv.addEventListener('dragstart', function(e) {
                        // Sätt draggedItem med typ "chromeWindow" och skicka med fönstrets data
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
                    const isOpen = (bookmarkManagerData.chromeWindowStates && bookmarkManagerData.chromeWindowStates[windowData.windowId]) !== false; // Standard: öppen
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
                        groupDragHandle.textContent = groupInfo && groupInfo.title ? groupInfo.title : 'Tab Group'; // Exempelikon

                        groupContainer.addEventListener('dragstart', function(e) {
                            e.stopPropagation(); // Hindra att händelsen når underliggande element
                            draggedItem = {
                              type: 'chromeTabGroup',
                              data: {
                                title: groupInfo.title,
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
                        //groupTitle.textContent = groupInfo && groupInfo.title ? groupInfo.title : 'Tab Group';
                        //groupContainer.draggable = true;
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

                    if (ungroupedTabs.length > 0) {
                        const ungroupedContainer = document.createElement('div');
                        ungroupedContainer.className = 'ungrouped-tabs';
                        ungroupedTabs.forEach(tabData => {
                            const tabDiv = createChromeTabElement({
                                id: tabData.tabId,
                                title: tabData.title,
                                url: tabData.url,
                                favIconUrl: tabData.favIconUrl
                            }, windowData.windowId);
                            ungroupedContainer.appendChild(tabDiv);
                        });
                        tabsList.appendChild(ungroupedContainer);
                    }

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
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}


// Uppdaterad togglePane funktion
function togglePane(paneId) {
    const pane = document.getElementById(paneId);
    const isOpen = !pane.classList.contains('closed');

    // Toggle the closed class which triggers CSS transitions
    pane.classList.toggle('closed');
    pane.classList.remove('hover-open');

    // Update the data state
    if (paneId === 'leftPane') {
        bookmarkManagerData.leftPaneOpen = !isOpen;
    } else if (paneId === 'rightPane') {
        bookmarkManagerData.rightPaneOpen = !isOpen;
    }

    saveToLocalStorage();
}

function createDefaultCollection() {
    return {
        name: "Kodar.Ninja",
        isOpen: true,
        bookmarks: [
            {
                title: "ThrustMe!",
                url: "https://kodarninja.itch.io/thrustme",
                description: "🚀Thrust Me is a thrilling space adventure with danger and treasure!🌟🕹️",
                icon: "https://kodarninja.itch.io/favicon.ico",
                id: "8c3c7744-9e1c-48f5-8e95-251a2effef80",
                deleted: false,
                lastModified: 1737456756973,
                position: 0
            },
            {
                title: "TheFile.Ninja",
                url: "https://thefile.ninja/",
                description: "A superfast, future-ready file manager powered by Everything.",
                icon: "https://thefile.ninja/favicon.ico",
                id: "2b9eea23-644a-4def-b94a-b4fc8fc6cddb",
                deleted: false,
                lastModified: 1737456756973,
                position: 5
            },
            {
                title: "Labs.Kodar.Ninja",
                url: "https://labs.kodar.ninja/",
                description: "All my projects and experiments at one place.",
                icon: "https://thefile.ninja/favicon.ico",
                id: "2b9eea24-144a-4dff-b94a-b4fc8fc6cddb",
                deleted: false,
                lastModified: 1737456756973,
                position: 6
            },
            {
                id: "1b82111d-5f1b-43d0-b188-a5cdaac95ced",
                title: "kodar.ninja - itch.io",
                url: "https://kodarninja.itch.io/",
                description: "",
                icon: "https://kodarninja.itch.io/favicon.ico",
                lastModified: 1737456756973,
                deleted: false,
                position: 14
            }
        ],
        id: "b7fea125-d5be-4068-84a5-040f57c70637",
        deleted: false,
        lastModified: 1737525179502,
        position: 0
    };
}

    // Uppdaterad applyPaneStates funktion
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

// Hover-to-open (peek) for closed side panes - desktop only
function setupPaneHoverBehavior() {
    const leftPane = document.getElementById('leftPane');
    const rightPane = document.getElementById('rightPane');
    let hoverTimeout = null;

    function handleMouseEnter(pane) {
        if (window.innerWidth <= 768) return;
        if (!pane.classList.contains('closed')) return;
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        pane.classList.add('hover-open');
    }

    function handleMouseLeave(pane) {
        if (!pane.classList.contains('hover-open')) return;
        hoverTimeout = setTimeout(() => {
            pane.classList.remove('hover-open');
            hoverTimeout = null;
        }, 300);
    }

    leftPane.addEventListener('mouseenter', () => handleMouseEnter(leftPane));
    leftPane.addEventListener('mouseleave', () => handleMouseLeave(leftPane));
    rightPane.addEventListener('mouseenter', () => handleMouseEnter(rightPane));
    rightPane.addEventListener('mouseleave', () => handleMouseLeave(rightPane));

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            leftPane.classList.remove('hover-open');
            rightPane.classList.remove('hover-open');
        }
    });
}


// Funktion för att lägga till drag-and-drop lyssnare på bokmärken
function addBookmarkDragListeners(bookmarkElement) {
    bookmarkElement.addEventListener('dragstart', dragStartBookmark);
    bookmarkElement.addEventListener('dragend', dragEnd);
    bookmarkElement.addEventListener('dragover', (e) => { e.preventDefault(); });
}

// Funktion för att lägga till drag-and-drop lyssnare på samlingar
function addCollectionDragListeners(collectionElement) {
    const dragHandle = collectionElement.querySelector('.drag-handle');
    if (dragHandle) {
        dragHandle.addEventListener('dragstart', dragStartCollection);
        dragHandle.addEventListener('dragend', dragEnd);
    }

    // Lägg till dragover på collection containern
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

// Initialiseringskod
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();

    // Migrate spaces to object format after loading
    migrateSpacesToObjectFormat();

    renderCollections();
    fetchChromeTabs();

    // Listen for Chrome tab changes instead of polling
    chrome.tabs.onCreated.addListener(fetchChromeTabsDebounced);
    chrome.tabs.onRemoved.addListener(fetchChromeTabsDebounced);
    chrome.tabs.onUpdated.addListener(fetchChromeTabsDebounced);
    chrome.tabs.onMoved.addListener(fetchChromeTabsDebounced);
    chrome.tabs.onAttached.addListener(fetchChromeTabsDebounced);
    chrome.tabs.onDetached.addListener(fetchChromeTabsDebounced);
    chrome.windows.onCreated.addListener(fetchChromeTabsDebounced);
    chrome.windows.onRemoved.addListener(fetchChromeTabsDebounced);

    // Initialize spaces functionality
    initializeSpaces();

    document.getElementById('addCollection').addEventListener('click', addCollection);
    
    document.getElementById('openInNewTab').addEventListener('change', (e) => {
        bookmarkManagerData.openInNewTab = e.target.checked;
        saveToLocalStorage();
    });

    // Ny uppdaterad dark mode event listener
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
        // Disable zen mode on mobile devices
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
        // Disable zen mode on mobile
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
    document.getElementById('backupFrequency').addEventListener('change', (e) => {
        bookmarkManagerData.autoBackup.frequency = e.target.value;
        bookmarkManagerData.autoBackup.enabled = e.target.value !== 'disabled';
        updateBackupSettingsVisibility();
        saveToLocalStorage();
        syncToStorage();
    });

    document.getElementById('backupRetention').addEventListener('change', (e) => {
        bookmarkManagerData.autoBackup.keepDays = parseInt(e.target.value);
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
            const currentFolder = bookmarkManagerData.autoBackup.customFolderName || 'TheTabNinja';
            const customPath = prompt('Enter subfolder name for backups (will be created in Downloads):', currentFolder);
            
            if (customPath && customPath.trim()) {
                const folderName = customPath.trim();
                bookmarkManagerData.autoBackup.useCustomFolder = true;
                bookmarkManagerData.autoBackup.customFolderName = folderName;
                
                // Update UI
                document.getElementById('backupFolderPath').textContent = `Downloads/${folderName}`;
                
                saveToLocalStorage();
                syncToStorage();
                
                alert(`Backups will be saved to: Downloads/${folderName}/`);
            }
        } catch (error) {
            console.error('Error selecting backup folder:', error);
            alert('Error selecting folder: ' + error.message);
        }
    });

    // Open backup folder button
    document.getElementById('openBackupFolder').addEventListener('click', async () => {
        try {
            const folderName = bookmarkManagerData.autoBackup.customFolderName;
            if (folderName) {
                alert(`Backup folder: Downloads/${folderName}/\n\nOpen your Downloads folder and look for the "${folderName}" subfolder.`);
            } else {
                alert('Backup folder: Downloads/\n\nBackups are saved directly to your Downloads folder.');
            }
        } catch (error) {
            console.error('Error opening backup folder:', error);
            alert('Error: Could not determine backup folder location.');
        }
    });

    // GitHub settings event listeners - sync both githubConfig and syncConfig.providers.github
    document.getElementById('githubUsername').addEventListener('change', (e) => {
        bookmarkManagerData.githubConfig.username = e.target.value;
        bookmarkManagerData.syncConfig.providers.github.username = e.target.value;
        saveToLocalStorage();
        updateSyncButtonVisibility();
    });

    document.getElementById('githubRepo').addEventListener('change', (e) => {
        bookmarkManagerData.githubConfig.repo = e.target.value;
        bookmarkManagerData.syncConfig.providers.github.repo = e.target.value;
        saveToLocalStorage();
        updateSyncButtonVisibility();
    });

    document.getElementById('githubPat').addEventListener('change', (e) => {
        bookmarkManagerData.githubConfig.pat = e.target.value;
        bookmarkManagerData.syncConfig.providers.github.pat = e.target.value;
        saveToLocalStorage();
        updateSyncButtonVisibility();
    });

    document.getElementById('syncButton').addEventListener('click', handleSyncClick);
        
        // Beta features toggle
        const betaToggle = document.getElementById('enableBetaFeatures');
        if (betaToggle) {
            betaToggle.checked = !!bookmarkManagerData.enableBetaFeatures;
            betaToggle.addEventListener('change', (e) => {
                bookmarkManagerData.enableBetaFeatures = e.target.checked;
                // Persist and refresh UI that depends on beta toggle
                saveToLocalStorage();
                updateSyncProviderUI();
                updateSyncButtonVisibility();
            });
        }
    
    // Sync provider selection event listener
    document.getElementById('syncProvider').addEventListener('change', (e) => {
        bookmarkManagerData.syncConfig.activeProvider = e.target.value;
        saveToLocalStorage();
        updateSyncProviderUI();
        updateSyncButtonVisibility();
    });
    
    // Google Drive authentication button
    document.getElementById('googledriveAuthBtn').addEventListener('click', authenticateGoogleDrive);
    
    // Google Drive disconnect button
    document.getElementById('googledriveDisconnectBtn').addEventListener('click', disconnectGoogleDrive);

    // Local Drive buttons
    document.getElementById('localdriveChooseBtn').addEventListener('click', connectLocalDrive);
    document.getElementById('localdriveDisconnectBtn').addEventListener('click', disconnectLocalDrive);

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

    // Left pane tabs functionality
    initializeLeftPaneTabs();

    function updateBackupSettingsVisibility() {
        const enabled = bookmarkManagerData.autoBackup.frequency !== 'disabled';
        const retentionSection = document.getElementById('backupRetentionSection');
        const folderSection = document.getElementById('backupFolderSection');
        
        if (retentionSection) {
            retentionSection.style.display = enabled ? 'block' : 'none';
        }
        if (folderSection) {
            folderSection.style.display = enabled ? 'block' : 'none';
        }
    }

    async function syncToStorage() {
        try {
            await chrome.storage.local.set({ bookmarkManagerData: bookmarkManagerData });
        } catch (error) {
            console.error('Error syncing to storage:', error);
        }
    }

    function loadBackupSettings() {
        const backupFrequency = document.getElementById('backupFrequency');
        const backupRetention = document.getElementById('backupRetention');
        const backupFolderPath = document.getElementById('backupFolderPath');
        
        if (backupFrequency) {
            backupFrequency.value = bookmarkManagerData.autoBackup.frequency;
        }
        if (backupRetention) {
            backupRetention.value = bookmarkManagerData.autoBackup.keepDays.toString();
        }
        if (backupFolderPath) {
            const folderDisplay = bookmarkManagerData.autoBackup.useCustomFolder && bookmarkManagerData.autoBackup.customFolderName 
                ? `Downloads/${bookmarkManagerData.autoBackup.customFolderName}`
                : 'Downloads';
            backupFolderPath.textContent = folderDisplay;
        }
        
        updateBackupSettingsVisibility();
    }

    // Initialisera GitHub-fälten och sync-knappens synlighet
    document.getElementById('githubUsername').value = bookmarkManagerData.githubConfig.username || '';
    document.getElementById('githubRepo').value = bookmarkManagerData.githubConfig.repo || '';
    document.getElementById('githubPat').value = bookmarkManagerData.githubConfig.pat || '';
    
    // Initialize sync provider UI
    updateSyncProviderUI();
    updateSyncButtonVisibility();
    
    // Load backup settings
    loadBackupSettings();


    const searchBox = document.getElementById('searchBox');    
    if (searchBox) {
        setTimeout(() => {

            searchBox.focus();
        }, 100); // En fördröjning på 100 millisekunder (justera vid behov)
    }

    document.getElementById('searchBox').addEventListener('input', function() {
        const searchTerm = this.value.trim();
        applyFilter(searchTerm);
    });
    
    // Add keydown listener for Google search functionality
    document.getElementById('searchBox').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const searchTerm = this.value.trim();
            if (searchTerm.startsWith('?') && searchTerm.length > 1) {
                const googleQuery = searchTerm.substring(1); // Remove the ?
                const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;
                
                if (bookmarkManagerData.openInNewTab) {
                    window.open(googleUrl, '_blank');
                } else {
                    window.location.href = googleUrl;
                }
                
                // Clear search box
                this.value = '';
                applyFilter('');
                event.preventDefault();
            } else if (searchTerm.startsWith('!') && searchTerm.length > 1) {
                const chatGptQuery = searchTerm.substring(1); // Remove the !
                const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatGptQuery)}`;
                
                if (bookmarkManagerData.openInNewTab) {
                    window.open(chatGptUrl, '_blank');
                } else {
                    window.location.href = chatGptUrl;
                }
                
                // Clear search box
                this.value = '';
                applyFilter('');
                event.preventDefault();
            }
        }
    });

    // applyFilter function moved to global scope

    // Global drop-hanterare för att skapa nya Collections från Tab Groups
    document.addEventListener('dragover', (e) => {
        // Förhindra standard drop-beteende för att möjliggöra custom drop
        const creatableTypes = ['chromeTabGroup', 'chromeWindow'];
    
        if (draggedItem && creatableTypes.includes(draggedItem.type)) {
            // Hitta den närmaste collectionen. Om det inte finns någon (dvs. vi är över den tomma ytan),
            // eller om vi är över en annan del av sidan som inte är en specifik släppzon,
            // så tillåter vi släppet här.
            const closestCollection = e.target.closest('.collection');
            
            // Om muspekaren INTE är över en befintlig collection,
            // betyder det att vi är över "arbetsytan".
            if (!closestCollection) {
                // TALA OM FÖR WEBLÄSAREN ATT SLÄPP ÄR TILLÅTET
                e.preventDefault();
                
                // Ge visuell feedback (valfritt men bra UX)
                e.dataTransfer.dropEffect = 'copy'; 
            }
            // Om vi ÄR över en collection, gör vi ingenting här.
            // Då kommer den specifika lyssnaren på .collection att hantera det,
            // tack vare `stopPropagation()` som vi lade till tidigare.
        }
    });

    document.addEventListener('drop', (e) => {
        // Kontrollera om det är en Tab Group som droppas
        if (draggedItem && (draggedItem.type === 'chromeTabGroup' || draggedItem.type === 'chromeWindow')) {
            // Kontrollera om droppet skedde utanför en Collection
            const closestCollection = e.target.closest('.collection');
            const closestBookmarksContainer = e.target.closest('.bookmarks');
            
            // Om vi inte är över en Collection eller bookmarks container, skapa ny Collection
            if (!closestCollection && !closestBookmarksContainer) {
                e.preventDefault();
                
                try {
                    // Skapa ny Collection från Tab Group data
                    const newCollection = createCollectionFromTabGroup(draggedItem.data);
                    
                    // Uppdatera UI
                    renderCollections();
                    saveToLocalStorage();
                    
                    console.log('Created new collection from tab group:', newCollection.name);
                    
                    // Visuell feedback - blink den nya kollektionen
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
                
                // Rensa draggedItem
                draggedItem = null;
            }
            // Om droppet skedde över en Collection eller bookmarks container, 
            // låt event:et bubblande upp till den specifika drop-handleren
            // (dvs. gör inget här, dropBookmarkContainer kommer att hantera det)
        }
    });
});

// Left pane tabs functionality
function initializeLeftPaneTabs() {
    // Load active tab from localStorage
    if (bookmarkManagerData.activeLeftTab) {
        switchLeftTab(bookmarkManagerData.activeLeftTab);
    }
    
    // Add event listeners for tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchLeftTab(tabName);
        });
    });
}

function switchLeftTab(tabName) {
    // Update active tab in data
    bookmarkManagerData.activeLeftTab = tabName;
    saveToLocalStorage();
    
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab and pane
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Add activeLeftTab to the data structure
if (!bookmarkManagerData.activeLeftTab) {
    bookmarkManagerData.activeLeftTab = 'spaces';
}

// Funktion som startar konfetti-animationen
function startConfetti(options = {}) {
    const { particleCount = 100, duration = 300, origin = { x: 0.5, y: 0.6 } } = options;
  
    // Skapa och konfigurera canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
  
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    // Skapa partiklar
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(origin, canvas.width, canvas.height));
    }
  
    let startTime = null;
  
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        // Beräkna en faktor som är hög i början (t.ex. 2) och minskar linjärt till 1 mot slutet.
        const maxFactor = 2; // Ändra detta värde för att starta ännu snabbare
        const factor = 1 + (maxFactor - 1) * (1 - elapsed / duration);
      
        // Uppdatera och rita varje partikel med den dynamiska faktorn
        particles.forEach(p => {
          p.x += p.vx * factor;
          p.y += p.vy * factor;
          p.vy += 0.05; // gravitation
          p.rotation += p.rotationSpeed;
          p.opacity = Math.max(0, p.opacity - 0.005);
      
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });
      
        if (elapsed < duration) {
          requestAnimationFrame(animate);
        } else {
          document.body.removeChild(canvas);
        }
    }
  
    requestAnimationFrame(animate);
  }
  
  // Hjälpfunktion för att skapa en partikel
  function createParticle(origin, width, height) {
    const x = origin.x * width;
    const y = origin.y * height;
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 4 + 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = Math.random() * 8 + 4;
    const colors = [
      { r: 239, g: 71, b: 111 }, // röd
      { r: 255, g: 209, b: 102 }, // gul
      { r: 6,   g: 214, b: 160 }, // grön
      { r: 17,  g: 138, b: 178 }  // blå
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
  
    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      size: size,
      rotation: Math.random() * 2 * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: color,
      opacity: 1
    };
  }
  
  // Använd event listeners på knappen
  const supportButton = document.getElementById('supportButton');
let confettiTimeout;

supportButton.addEventListener('mouseenter', function(e) {
  // Beräkna muspositionen som en normaliserad koordinat
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

// Left pane tabs functionality
function initializeLeftPaneTabs() {
    // Load active tab from localStorage
    if (bookmarkManagerData.activeLeftTab) {
        switchLeftTab(bookmarkManagerData.activeLeftTab);
    }
    
    // Add event listeners for tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchLeftTab(tabName);
        });
    });
}

function switchLeftTab(tabName) {
    // Update active tab in data
    bookmarkManagerData.activeLeftTab = tabName;
    saveToLocalStorage();
    
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab and pane
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Add activeLeftTab to the data structure
if (!bookmarkManagerData.activeLeftTab) {
    bookmarkManagerData.activeLeftTab = 'spaces';
}

// Spaces Management Functions
function renderSpaces() {
    const spacesList = document.getElementById('spacesList');
    if (!spacesList) return;
    
    spacesList.innerHTML = '';
    
    // Ensure spaces are in object format
    migrateSpacesToObjectFormat();
    
    // Filter out deleted spaces
    const activeSpaces = bookmarkManagerData.spaces.filter(space => !space.deleted);
    
    activeSpaces.forEach(spaceObj => {
        const spaceName = spaceObj.name;
        const spaceItem = document.createElement('div');
        spaceItem.className = 'space-item';
        if (spaceName === bookmarkManagerData.currentSpace) {
            spaceItem.classList.add('active');
        }
        
        spaceItem.innerHTML = `
            <span class="space-name">${escapeHtml(spaceName)}</span>
            ${spaceName !== 'Everything' ? '<button class="delete-space-btn" data-space="' + escapeHtml(spaceName) + '">×</button>' : ''}
        `;
        
        // Add click listener for space selection
        spaceItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-space-btn')) {
                selectSpace(spaceName);
            }
        });
        
        // Add delete listener if delete button exists
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
    
    // Ensure spaces are in object format
    migrateSpacesToObjectFormat();
    
    // Check if space already exists (including deleted ones)
    const existingSpace = bookmarkManagerData.spaces.find(s => s.name === spaceName);
    if (existingSpace) {
        if (existingSpace.deleted) {
            // Resurrect the deleted space
            existingSpace.deleted = false;
            existingSpace.lastModified = Date.now();
        } else {
            alert('A space with this name already exists');
            return;
        }
    } else {
        // Add new space
        bookmarkManagerData.spaces.push({
            name: spaceName,
            deleted: false,
            lastModified: Date.now()
        });
    }
    saveToLocalStorage();
    
    // Clear input and re-render
    newSpaceNameInput.value = '';
    renderSpaces();
}

// Migration function to convert spaces from string array to object array
function migrateSpacesToObjectFormat() {
    if (!Array.isArray(bookmarkManagerData.spaces)) {
        bookmarkManagerData.spaces = ['Everything'];
    }
    
    const needsMigration = bookmarkManagerData.spaces.some(space => typeof space === 'string');
    if (needsMigration) {
        bookmarkManagerData.spaces = bookmarkManagerData.spaces.map(space => {
            if (typeof space === 'string') {
                return {
                    name: space,
                    deleted: false,
                    lastModified: Date.now()
                };
            }
            return space;
        });
    }
}

function deleteSpace(spaceName) {
    if (spaceName === 'Everything') {
        alert('Cannot delete the "Everything" space');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the space "${spaceName}"?`)) {
        // Ensure spaces are in object format
        migrateSpacesToObjectFormat();
        
        // Soft delete the space
        const spaceObj = bookmarkManagerData.spaces.find(s => s.name === spaceName);
        if (spaceObj) {
            spaceObj.deleted = true;
            spaceObj.lastModified = Date.now();
        }
        
        // If this was the current space, switch to Everything
        if (bookmarkManagerData.currentSpace === spaceName) {
            bookmarkManagerData.currentSpace = 'Everything';
        }
        
        // Remove this space from all collections that use it
        bookmarkManagerData.collections.forEach(collection => {
            if (collection.spaces && Array.isArray(collection.spaces)) {
                const spaceIndex = collection.spaces.indexOf(spaceName);
                if (spaceIndex > -1) {
                    collection.spaces.splice(spaceIndex, 1);
                    // Ensure at least Everything remains
                    if (collection.spaces.length === 0 || !collection.spaces.includes('Everything')) {
                        collection.spaces = ['Everything'];
                    }
                    collection.lastModified = Date.now();
                }
            }
        });
        
        saveToLocalStorage();
        renderSpaces();
        renderCollections(); // Re-render collections since spaces have changed
    }
}

function selectSpace(spaceName) {
    bookmarkManagerData.currentSpace = spaceName;
    saveToLocalStorage();
    renderSpaces();
    
    // Filter and re-render collections based on selected space
    renderCollections();
}

function initializeSpaces() {
    // Ensure spaces array exists and has Everything
    if (!bookmarkManagerData.spaces || !Array.isArray(bookmarkManagerData.spaces)) {
        bookmarkManagerData.spaces = ['Everything'];
    }
    
    // Migrate to object format
    migrateSpacesToObjectFormat();
    
    // Ensure Everything exists and is not deleted
    let everythingSpace = bookmarkManagerData.spaces.find(s => s.name === 'Everything');
    if (!everythingSpace) {
        bookmarkManagerData.spaces.unshift({
            name: 'Everything',
            deleted: false,
            lastModified: Date.now()
        });
    } else {
        everythingSpace.deleted = false; // Everything can never be deleted
    }
    
    // Ensure currentSpace is set and exists
    const activeSpaceNames = bookmarkManagerData.spaces.filter(s => !s.deleted).map(s => s.name);
    if (!bookmarkManagerData.currentSpace || !activeSpaceNames.includes(bookmarkManagerData.currentSpace)) {
        bookmarkManagerData.currentSpace = 'Everything';
    }
    
    // Add event listeners
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
        
        // Enable/disable add button based on input
        newSpaceNameInput.addEventListener('input', (e) => {
            const addBtn = document.getElementById('addSpaceBtn');
            if (addBtn) {
                addBtn.disabled = !e.target.value.trim();
            }
        });
    }
    
    // Render spaces
    renderSpaces();
}

// Collection to Space Drag & Drop Functions
function showSpaceDropZones() {
    // Kontrollera om spaces-fliken är aktiv
    const spacesTab = document.getElementById('spaces-tab');
    if (!spacesTab || !spacesTab.classList.contains('active')) {
        return; // Visa bara drop-zones om spaces-fliken är aktiv
    }
    
    console.log('Showing space drop zones'); // Debug log
    
    const spaceItems = document.querySelectorAll('.space-item');
    console.log('Found space items:', spaceItems.length); // Debug log
    
    spaceItems.forEach(spaceItem => {
        // Lägg till drop-zone indikator och event listeners
        spaceItem.classList.add('drop-zone-active');
        spaceItem.addEventListener('dragenter', spaceDragEnter);
        spaceItem.addEventListener('dragover', spaceDragOver);
        spaceItem.addEventListener('drop', spaceDropHandler);
        spaceItem.addEventListener('dragleave', spaceDragLeave);
    });
}

function hideSpaceDropZones() {
    console.log('Hiding space drop zones'); // Debug log
    
    const spaceItems = document.querySelectorAll('.space-item');
    spaceItems.forEach(spaceItem => {
        spaceItem.classList.remove('drop-zone-active', 'drag-over');
        spaceItem.removeEventListener('dragenter', spaceDragEnter);
        spaceItem.removeEventListener('dragover', spaceDragOver);
        spaceItem.removeEventListener('drop', spaceDropHandler);
        spaceItem.removeEventListener('dragleave', spaceDragLeave);
    });
}

function spaceDragEnter(e) {
    if (draggedItem && draggedItem.type === 'collection') {
        e.preventDefault();
        console.log('Drag enter on space:', this.textContent); // Debug log
    }
}

function spaceDragOver(e) {
    console.log('Drag over space - effectAllowed:', e.dataTransfer.effectAllowed); // Debug log
    
    if (draggedItem && draggedItem.type === 'collection') {
        e.preventDefault();
        e.stopPropagation(); // Förhindra event bubbling
        e.dataTransfer.dropEffect = 'copy'; // Matchar nu copyMove effectAllowed
        this.classList.add('drag-over');
        console.log('✅ Drop allowed - dropEffect set to copy, target:', this.textContent.trim()); // Debug log
        return false; // Extra säkerhet för att indikera att drop är tillåtet
    } else {
        e.dataTransfer.dropEffect = 'none'; // Förhindra drop om det inte är en collection
        console.log('❌ Drop not allowed - wrong drag type'); // Debug log
    }
}

function spaceDragLeave(e) {
    // Kontrollera att vi verkligen lämnar elementet och inte bara ett child-element
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

function spaceDropHandler(e) {
    console.log('Drop handler called!'); // Debug log
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    
    if (!draggedItem || draggedItem.type !== 'collection') {
        console.log('Invalid drop - no draggedItem or wrong type'); // Debug log
        return;
    }
    
    // Hitta vilket space som collection droppades på
    const spaceNameElement = this.querySelector('.space-name');
    if (!spaceNameElement) return;
    
    const targetSpaceName = spaceNameElement.textContent.trim();
    const collectionId = draggedItem.collectionId;
    
    // Hitta collection och lägg till space om det inte redan finns
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
            
            // Visa bekräftelse
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
            // Visa att space redan finns
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

// Zen Mode Functions
let zenDateTimeInterval = null;
let zenScrollListener = null;
let zenSearchListener = null;
let zenKeyboardListener = null;
let zenClickListener = null;
let zenUserHasScrolled = false;  // Flagga för att spåra manuell scroll

function startZenMode() {
    // Reset scroll flag
    zenUserHasScrolled = false;
    
    // Start the date/time update
    updateZenDateTime();
    zenDateTimeInterval = setInterval(updateZenDateTime, 1000);
    
    // Add scroll listener with debouncing
    zenScrollListener = debounce(handleZenScroll, 50);
    window.addEventListener('scroll', zenScrollListener, { passive: true });
    
    // Add search listener
    zenSearchListener = handleZenSearch;
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', zenSearchListener);
    }
    
    // Add input listener for zen search box - transfer to main search and exit zen
    const zenSearchBox = document.getElementById('zenSearchBox');
    if (zenSearchBox) {
        zenSearchBox.addEventListener('input', function(event) {
            const searchValue = event.target.value;
            const mainSearchBox = document.getElementById('searchBox');
            
            console.log("Zen search input:", searchValue);
            
            // Transfer text to main search box
            mainSearchBox.value = searchValue;
            
            // If user typed something, immediately exit zen mode
            if (searchValue.trim().length > 0) {
                console.log("Exiting zen mode and transferring to main search");
                
                // Exit zen mode completely
                document.body.classList.remove('zen-mode');
                stopZenMode();
                
                // Trigger search in main search box
                mainSearchBox.dispatchEvent(new Event("input", { bubbles: true }));
                
                // Focus main search box
                setTimeout(() => {
                    mainSearchBox.focus();
                    mainSearchBox.setSelectionRange(searchValue.length, searchValue.length);
                    console.log("Focused main search box");
                }, 100);
            }
        });
        
        // Add keydown listener for Google search functionality in zen mode
        zenSearchBox.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const searchTerm = this.value.trim();
                if (searchTerm.startsWith('?') && searchTerm.length > 1) {
                    const googleQuery = searchTerm.substring(1); // Remove the ?
                    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;
                    
                    if (bookmarkManagerData.openInNewTab) {
                        window.open(googleUrl, '_blank');
                    } else {
                        window.location.href = googleUrl;
                    }
                    
                    // Clear search box and exit zen mode
                    this.value = '';
                    document.body.classList.remove('zen-mode');
                    stopZenMode();
                    event.preventDefault();
                } else if (searchTerm.startsWith('!') && searchTerm.length > 1) {
                    const chatGptQuery = searchTerm.substring(1); // Remove the !
                    const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatGptQuery)}`;
                    
                    if (bookmarkManagerData.openInNewTab) {
                        window.open(chatGptUrl, '_blank');
                    } else {
                        window.location.href = chatGptUrl;
                    }
                    
                    // Clear search box and exit zen mode
                    this.value = '';
                    document.body.classList.remove('zen-mode');
                    stopZenMode();
                    event.preventDefault();
                }
            }
        });
        
        // Auto focus on zen search box initially
        setTimeout(() => {
            zenSearchBox.focus();
            console.log("Zen search box focused");
        }, 200);
    }

    // Add global keyboard handler for zen mode
    zenKeyboardListener = handleZenKeyboard;
    document.addEventListener('keydown', zenKeyboardListener);
    
    // Add click handler for auto-refocus
    zenClickListener = handleZenClick;
    document.addEventListener('click', zenClickListener);
    
    // Show the zen date/time display
    const zenDateTime = document.getElementById('zenDateTime');
    if (zenDateTime) {
        zenDateTime.style.display = 'flex';
    }
}

function stopZenMode() {
    // Reset scroll flag
    zenUserHasScrolled = false;
    
    // Clear the date/time interval
    if (zenDateTimeInterval) {
        clearInterval(zenDateTimeInterval);
        zenDateTimeInterval = null;
    }
    
    // Remove scroll listener
    if (zenScrollListener) {
        window.removeEventListener('scroll', zenScrollListener);
        zenScrollListener = null;
    }
    
    // Remove search listener
    if (zenSearchListener) {
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            searchBox.removeEventListener('input', zenSearchListener);
        }
        
        const zenSearchBox = document.getElementById('zenSearchBox');
        if (zenSearchBox) {
            zenSearchBox.removeEventListener('input', zenSearchListener);
        }
        
        zenSearchListener = null;
    }
    
    // Remove keyboard listener
    if (zenKeyboardListener) {
        document.removeEventListener('keydown', zenKeyboardListener);
        zenKeyboardListener = null;
    }
    
    // Remove click listener
    if (zenClickListener) {
        document.removeEventListener('click', zenClickListener);
        zenClickListener = null;
    }
    
    // Hide the zen date/time display
    const zenDateTime = document.getElementById('zenDateTime');
    if (zenDateTime) {
        zenDateTime.style.display = 'none';
    }
    
    // Reset collections margin and classes
    const collections = document.getElementById('collections');
    if (collections) {
        collections.style.marginTop = '';
    }
    document.body.classList.remove('scrolled', 'searching');
}

function updateZenDateTime() {
    const now = new Date();
    const timeElement = document.querySelector('.zen-time');
    const dateElement = document.querySelector('.zen-date');
    
    if (timeElement && dateElement) {
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit'
        };
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const preferredLocales = (navigator.languages && navigator.languages.length > 0)
            ? navigator.languages
            : (navigator.language ? [navigator.language] : undefined);

        timeElement.textContent = now.toLocaleTimeString(preferredLocales, timeOptions);
        dateElement.textContent = now.toLocaleDateString(preferredLocales, dateOptions);
    }
}

function handleZenScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const collections = document.getElementById('collections');
    
    if (scrollPosition > 50) {
        // User has scrolled, set flag and remove offset
        zenUserHasScrolled = true;
        if (collections) {
            collections.style.marginTop = '0';
        }
        document.body.classList.add('scrolled');
    } else {
        // User is near top
        const searchBox = document.getElementById('searchBox');
        const isSearching = searchBox && searchBox.value.trim().length > 0;
        
        // Only restore offset if not searching and user hasn't manually scrolled
        if (document.body.classList.contains('zen-mode') && collections && !isSearching && !zenUserHasScrolled) {
            collections.style.marginTop = '100vh';
        }
        
        // Keep 'scrolled' class if user has manually scrolled (to keep clock hidden)
        if (!zenUserHasScrolled) {
            document.body.classList.remove('scrolled');
        }
    }
}

function handleZenSearch(event) {
    console.log('handleZenSearch called with value:', event.target.value);
    const searchValue = event.target.value.trim();
    const collections = document.getElementById('collections');
    const mainSearchBox = document.getElementById('searchBox');
    
    if (searchValue.length > 0) {
        // Transfer search value to main search box
        if (mainSearchBox) {
            mainSearchBox.value = searchValue;
        }
        
        // Apply the actual filter
        applyFilter(searchValue);
        
        // User is searching, remove the offset and add searching class
        if (collections) {
            collections.style.marginTop = '0';
        }
        document.body.classList.add('searching');
        
        // Focus main search box and hide zen search box
        if (mainSearchBox) {
            setTimeout(() => {
                mainSearchBox.focus();
            }, 100);
        }
    } else {
        // Search is empty, restore offset if zen mode is active and user is at top
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        document.body.classList.remove('searching');
        
        // Clear main search box too
        if (mainSearchBox) {
            mainSearchBox.value = '';
        }
        
        // Apply empty filter
        applyFilter('');
        
        // Only restore zen offset if user never scrolled AND they're at the top
        if (document.body.classList.contains('zen-mode') && scrollPosition <= 50 && collections && !zenUserHasScrolled) {
            collections.style.marginTop = '100vh';
            // Remove scrolled class only if user never manually scrolled
            document.body.classList.remove('scrolled');
        }
    }
}

// Debounce function för att förhindra för många scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global keyboard handler for zen mode
function handleZenKeyboard(event) {
    // Only handle in zen mode
    if (!document.body.classList.contains('zen-mode')) return;
    console.log("ZEN KEYBOARD EVENT:", event.key);
    
    // Skip if user is typing in an input field or other interactive element
    const activeElement = document.activeElement;
    const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.isContentEditable
    );
    
    // Handle Escape key - return to zen initial screen
    if (event.key === 'Escape') {
        console.log("ESC pressed in zen mode! (unique:", Date.now(), ") isSearching:", document.body.classList.contains('searching'), "hasScrolled:", zenUserHasScrolled);
        console.log("ESC pressed in zen mode! (unique:", Date.now(), ") isSearching:", document.body.classList.contains('searching'), "hasScrolled:", zenUserHasScrolled);
        event.preventDefault();
        
        // If user has scrolled down to collections or is searching, return to zen initial screen
        const isSearching = document.body.classList.contains('searching');
        const hasScrolled = zenUserHasScrolled;
        
        if (isSearching || hasScrolled) {
            console.log("ENTERING SCROLL BRANCH! isSearching:", isSearching, "hasScrolled:", hasScrolled);
            // Clear search
            const mainSearchBox = document.getElementById('searchBox');
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (mainSearchBox) mainSearchBox.value = '';
            if (zenSearchBox) zenSearchBox.value = '';
            
            // Remove searching class and reset scroll flag
            document.body.classList.remove('searching');
            zenUserHasScrolled = false;
            
            // Scroll back to top to show zen initial screen
            console.log("SCROLLING TO TOP!");
            
            // Force zen initial screen by setting collections margin
            const collections = document.getElementById("collections");
            if (collections) {
                collections.style.marginTop = "100vh";
                console.log("Set collections marginTop to 100vh");
            
            // Remove scrolled class to show clock again
            document.body.classList.remove('scrolled');
            console.log("Removed scrolled class to show clock");
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Focus zen search box after scroll completes
            setTimeout(() => {
                if (zenSearchBox) {
                    zenSearchBox.focus();
                }
            }, 500);
        } else {
            // If already at zen initial screen, just clear and focus zen search box
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (zenSearchBox) {
                zenSearchBox.value = '';
                zenSearchBox.focus();
                // Trigger input event to clear filters
                zenSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Remove searching class
            document.body.classList.remove('searching');
        }
        return;
    }
    
    // Handle alphanumeric keys - auto focus search box
    const isAlphanumeric = /^[a-zA-Z0-9 #%|]$/.test(event.key);
    if (isAlphanumeric && !isInInput) {
        event.preventDefault();
        const searchBox = getActiveZenSearchBox();
        if (searchBox) {
            searchBox.focus();
            // Insert the typed character
            searchBox.value = event.key;
            // Trigger input event to apply filter
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// Click handler for zen mode auto-refocus
function handleZenClick(event) {
    // Only handle in zen mode
    if (!document.body.classList.contains('zen-mode')) return;
    console.log("ZEN KEYBOARD EVENT:", event.key);
    
    const target = event.target;
    
    // List of interactive elements that should keep focus
    const interactiveElements = [
        'INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT', 'OPTION'
    ];
    
    // Check if clicked element or its parents are interactive
    let element = target;
    let isInteractive = false;
    
    while (element && element !== document.body) {
        if (interactiveElements.includes(element.tagName) || 
            element.isContentEditable ||
            element.classList.contains('pane-toggle') ||
            element.classList.contains('collection-button')) {
            isInteractive = true;
            break;
        }
        element = element.parentElement;
    }
    
    // If clicked on non-interactive element, refocus search box
    if (!isInteractive) {
        setTimeout(() => {
            const searchBox = getActiveZenSearchBox();
            if (searchBox) {
                searchBox.focus();
            }
        }, 10);
    }
}

// Helper function to get the appropriate search box for current zen state
function getActiveZenSearchBox() {
    const isScrolled = document.body.classList.contains('scrolled') || 
                      document.body.classList.contains('searching');
    
    if (isScrolled) {
        // User has scrolled/searched, use main search box
        return document.getElementById('searchBox');
    } else {
        // User is on initial zen screen, use zen search box
        return document.getElementById('zenSearchBox');
    }
}

// Helper function to clear search and maintain focus
function clearZenSearch() {
    const searchBox = getActiveZenSearchBox();
    if (searchBox) {
        searchBox.value = '';
        searchBox.focus();
        // Trigger input event to clear filters
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Remove searching class
    document.body.classList.remove('searching');
}

