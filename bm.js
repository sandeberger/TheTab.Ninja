//const extId = 'ekincidnpifabcbbchcapcahaoeoccgp' //test
const extId = 'bnmjmbmlfohkaghofdaadenippkgpmab'; //1.08
//https://wallpapersden.com/

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
    spaces: ['Everything'], // Default space that cannot be removed
    currentSpace: 'Everything',
    githubConfig: {
        username: '',
        repo: '',
        pat: '',
        filepath: 'bookmarks.json'
    }
};

let draggedItem = null;
let placeholder = null;

// Global funktion för att sätta bakgrundsbild
function setBackground(imageName, type = 'predefined') {
    if (type === 'custom') {
        // För anpassade bilder, imageName är redan en data URL
        document.body.style.backgroundImage = `url("${imageName}")`;
    } else if (imageName === 'wp_none.png') {
        document.body.style.backgroundImage = 'none';
    } else {
        document.body.style.backgroundImage = `url("large_${imageName}")`;
    }
}


/*document.addEventListener('DOMContentLoaded', () => {
    const backgroundSelect = document.getElementById('backgroundSelect');
    const savedBackground = localStorage.getItem('backgroundImage');

    if (savedBackground && backgroundSelect) {
        backgroundSelect.value = savedBackground;
        setBackground(savedBackground);
    }

    backgroundSelect.addEventListener('change', (event) => {
        const selectedBackground = event.target.value;
        setBackground(selectedBackground);
        localStorage.setItem('backgroundImage', selectedBackground);
    });

    const manifestData = chrome.runtime.getManifest();
    const version = manifestData.version;
    const versionDisplay = document.getElementById('versionDisplay');
    versionDisplay.textContent = `Version: ${version}`;
});*/

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
    // Lista med filnamn för dina bakgrundsbilder (se till att de finns i 'images/' mappen)
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
    let selectedThumbnail = null; // Variabel för att hålla reda på den valda miniatyren


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
            console.log('Klickade på anpassad bakgrund:', image.id);
            setCustomBackground(image.id);
        }
    });

    // Event listener för att ta bort bild (klick på X)
    const removeButton = thumbnail.querySelector('.remove-custom-bg');
    if (removeButton) {
        removeButton.addEventListener('click', (e) => {
            console.log('Klickade på ta bort knapp:', image.id);
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
        
        console.log('Anpassad bakgrundsbild uppladdad:', imageName);
    } catch (error) {
        console.error('Fel vid bilduppladdning:', error);
        alert('Ett fel uppstod vid bilduppladdning. Försök igen.');
    }
}

function compressImage(file, maxWidth = 800, quality = 0.8) {
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
    console.log('setCustomBackground called for:', imageId);
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
        console.log('Markerade anpassad thumbnail som vald:', imageId);
    } else {
        console.warn('Kunde inte hitta thumbnail för:', imageId);
    }
}

function removeCustomBackground(imageId) {
    console.log('removeCustomBackground called for:', imageId);
    
    if (!confirm('Är du säker på att du vill ta bort denna bakgrundsbild?')) {
        console.log('User cancelled removal');
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
        console.log('Bild borttagen från data:', imageId);
        
        // Om detta var den aktiva bakgrundsbilden, växla till standard
        if (customData.activeBackground === 'custom' && customData.activeImageId === imageId) {
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;
            
            // Sätt första fördefinierade bakgrundsbilden som standard
            const backgroundImages = [
                'wp_none.png',
                'wp_img01.png',
                'wp_img02.png',
                'wp_img03.png',
                'wp_img05.png',
                'wp_img06.png',
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
            
            if (backgroundImages.length > 0) {
                setBackground(backgroundImages[0]);
                localStorage.setItem('backgroundImage', backgroundImages[0]);
            }
            console.log('Bytte till standard bakgrundsbild');
        }
        
        saveCustomBackgrounds(customData);
        renderCustomBackgroundThumbnails();
        
        console.log('Anpassad bakgrundsbild borttagen framgångsrikt:', imageId);
    } catch (error) {
        console.error('Fel vid borttagning av bakgrundsbild:', error);
        alert('Ett fel uppstod vid borttagning av bakgrundsbilden.');
    }
}

function updateThumbnailSelection(imageId, type) {
    // Avmarkera alla thumbnails
    document.querySelectorAll('.background-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });

    // Markera rätt thumbnail
    if (type === 'custom') {
        const customThumbnail = document.querySelector(`[data-image-id="${imageId}"]`);
        if (customThumbnail) {
            customThumbnail.classList.add('selected');
        }
    } else {
        const predefinedThumbnail = document.querySelector(`[data-image-name="${imageId}"]`);
        if (predefinedThumbnail) {
            predefinedThumbnail.classList.add('selected');
        }
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

// Funktion för att rensa data för säker synkronisering (exkludera PAT)
function sanitizeDataForSync(data) {
    const sanitized = { ...data };
    
    // Ta bort PAT från githubConfig om den finns
    if (sanitized.githubConfig) {
        sanitized.githubConfig = {
            ...sanitized.githubConfig,
            pat: undefined // Exkludera PAT från synkronisering
        };
        // Ta bort undefined properties
        delete sanitized.githubConfig.pat;
    }
    
    return sanitized;
}

// Variabel för att spåra om synkronisering pågår
let isSyncing = false; 

// Huvudfunktion för synkronisering
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
            collections: (rawRemoteData.collections || []).map(enrichCollection),
            ...rawRemoteData
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
        const localSpaces = localData?.spaces || ['Everything'];
        const remoteSpaces = remoteData?.spaces || ['Everything'];
        const mergedSpaces = mergeSpaces(localSpaces, remoteSpaces);
        
        // Säkerställ att currentSpace fortfarande är giltig
        const localCurrentSpace = localData?.currentSpace || 'Everything';
        const remoteCurrentSpace = remoteData?.currentSpace || 'Everything';
        let mergedCurrentSpace = localCurrentSpace;
        
        // Om lokalt currentSpace inte finns i merged spaces, använd remote eller fallback
        if (!mergedSpaces.includes(localCurrentSpace)) {
            if (mergedSpaces.includes(remoteCurrentSpace)) {
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

    // Sortera och returnera
    return Array.from(collectionMap.values()).map(collection => ({
        ...collection,
        bookmarks: collection.bookmarks
            .filter(b => !b.deleted)
            .sort((a, b) => a.position - b.position)
    }));
}

function mergeBookmarks(localBookmarks, remoteBookmarks) {
    const bookmarkMap = new Map();

    // Först lägg till alla lokala bokmärken
    for (const bookmark of localBookmarks) {
        const existing = bookmarkMap.get(bookmark.id);
        if (!existing || existing.lastModified < bookmark.lastModified) {
            bookmarkMap.set(bookmark.id, bookmark);
        }
    }

    // Sedan merga med remote bokmärken
    for (const bookmark of remoteBookmarks) {
        const existing = bookmarkMap.get(bookmark.id);
        if (!existing) {
            bookmarkMap.set(bookmark.id, bookmark);
        } else {
            const merged = mergeBookmarkVersions(existing, bookmark);
            bookmarkMap.set(merged.id, merged);
        }
    }

    return Array.from(bookmarkMap.values());
}

function mergeBookmarkVersions(local, remote) {
    // 1. Om någon version är raderad, använd senaste raderingen
    if (local.deleted || remote.deleted) {
      const latest = local.lastModified > remote.lastModified ? local : remote;
      return {...latest, deleted: true};
    }
    
    // 2. Annars, använd senaste icke-raderade versionen
    return local.lastModified > remote.lastModified ? local : remote;
  }

function mergeSpaces(localSpaces, remoteSpaces) {
    // Kombinera och deduplicera spaces från båda källor
    const allSpaces = [...localSpaces, ...remoteSpaces];
    const uniqueSpaces = [...new Set(allSpaces)];
    
    // Säkerställ att 'Everything' alltid finns och är först
    const mergedSpaces = uniqueSpaces.filter(space => space !== 'Everything');
    mergedSpaces.unshift('Everything');
    
    return mergedSpaces;
}

function validateDataStructure(data) {
    if (!data || data === null) return true;
    if (data.collections && !Array.isArray(data.collections)) return false;
    
    return data.collections.every(c => {
        // Generera ID om det saknas
        if (typeof c.id !== 'string') c.id = generateUUID();
        // Säkerställ att bookmarks är en array
        if (!Array.isArray(c.bookmarks)) c.bookmarks = [];
        return true;
    });
}

function mergeProperty(current, incoming) {
    return current === incoming ? current : 
        (current || incoming);
}

// Hjälpfunktion för att hämta senaste bookmark-versionen
function getLatestBookmark(local, remote) {
    if (!local) return remote?.deleted ? null : remote;
    if (!remote) return local?.deleted ? null : local;

    // Prioritera icke-raderade versioner ENDAST om de är nyare
    if (local.deleted && !remote.deleted) {
        return local.lastModified > remote.lastModified ? local : remote;
    }
    if (!local.deleted && remote.deleted) {
        return remote.lastModified > local.lastModified ? remote : local;
    }

    // Annars välj senaste versionen
    return local.lastModified > remote.lastModified ? local : remote;
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
                icon: tab.favIconUrl || 'default-icon.png',
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
    const dataStr = JSON.stringify(bookmarkManagerData, null, 2);
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
                                icon: card.favIconUrl || (card.url ? await getFavicon(card.url) : 'default-icon.png') // Använd befintlig favIconUrl om den finns
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



// Uppdaterad funktion för att spara till localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));
        console.log('Saved data to localStorage');
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Uppdaterad funktion för att ladda från localStorage
function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('bookmarkManagerData');
        let parsedData = null;

        if (data) {
            parsedData = JSON.parse(data);
            
            // Enrich collections and bookmarks
            if (Array.isArray(parsedData.collections)) {
                parsedData.collections = parsedData.collections.map(enrichCollection);
            }

            const existingPat = bookmarkManagerData.githubConfig?.pat;

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
                .sort((a, b) => a.position - b.position);

            sortedCollections.forEach((collection) => {
                const collectionElement = document.createElement('div');
                collectionElement.className = `collection ${collection.isOpen ? 'is-open' : ''}`;
                collectionElement.setAttribute('draggable', true);
                collectionElement.dataset.collectionId = collection.id;

                // Collection Header
                const header = document.createElement('div');
                header.className = 'collection-header';

                // Drag Handle
                const dragHandle = document.createElement('span');
                dragHandle.className = 'drag-handle';
                dragHandle.textContent = '☰';
                dragHandle.setAttribute('draggable', true);

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
                    { className: 'move-collection', text: '▲', title: 'Move collection up', action: () => moveCollection(collection.id, -1) },
                    { className: 'move-collection', text: '▼', title: 'Move collection down', action: () => moveCollection(collection.id, 1) },
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

                // Trigger the filter to reapply after rendering
                const searchBox = document.getElementById('searchBox');
                if (searchBox) {
                    const event = new Event('input');
                    searchBox.dispatchEvent(event);
                }
            });

            saveToLocalStorage();
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

        function createButton(className, text, tooltipText) {
            const button = document.createElement('button');
            button.className = `collection-button ${className}`;
            button.textContent = text;
            if (tooltipText) {
                button.title = tooltipText;
            }
            return button;
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
                                icon: tab.favIconUrl || "default-icon.png",
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
                editBookmark(collectionId, bookmark.id);
            });

            deleteIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBookmark(collectionId, bookmark.id);
            });
            
            bookmarkElement.addEventListener('click', () => openBookmark(collectionId, bookmark.id));

            // Lägg till hover-effekter
            bookmarkElement.addEventListener('dragover', function(e) {
                this.style.transform = 'scale(1.02)';
                this.style.zIndex = '1000';
            });

            bookmarkElement.addEventListener('dragleave', function(e) {
                this.style.transform = 'scale(1)';
                this.style.zIndex = 'auto';
            });

            // Uppdaterad dragstart-effekt
            bookmarkElement.addEventListener('dragstart', function(e) {
                this.style.opacity = '0.5';
                this.style.transform = 'scale(0.95)';
                // ... resten av befintlig kod ...
            });

            bookmarkElement.addEventListener('dragend', function(e) {
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
                this.style.zIndex = 'auto';
                // ... resten av befintlig kod ...
            });

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
            const extensionId = extId; // Ersätt med ditt extension-ID
            return new Promise((resolve, reject) => {
                //chrome.runtime.sendMessage(extensionId, { action: 'fetchFavicon', url }, (response) => {
                chrome.runtime.sendMessage({ action: 'fetchFavicon', url }, (response) => {
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
// Helper function to enrich a single bookmark
function enrichBookmark(bookmark) {
    return {
        ...bookmark,
        parentCollection: bookmark.parentCollection || generateUUID(), // Behåll befintligt eller generera nytt
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
        bookmarks: (collection.bookmarks || []).map(enrichBookmark),
        // Säkerställ att spaces alltid är en array och innehåller minst Everything
        spaces: Array.isArray(collection.spaces) && collection.spaces.length > 0 
            ? collection.spaces 
            : ['Everything']
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

// Uppdaterad funktion för att redigera en samling
function editCollection(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    // Kontrollera om dark mode är aktivt
    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const inputBg = isDarkMode ? '#3a3a3a' : 'white';
    const inputBorder = isDarkMode ? '#555' : '#ccc';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';
    
    // Skapa overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    // Skapa dialog
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
    
    // Lägg till CSS animation
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
    
    // Fokusera på input och markera text
    const input = dialog.querySelector('#collectionNameInput');
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
    
    // Lägg till hover effects
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
    
    // Event handlers
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
    
    // Button events
    cancelBtn.addEventListener('click', closeDialog);
    saveBtn.addEventListener('click', saveCollection);
    
    // Enter key to save, Escape to cancel
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveCollection();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog();
        }
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}

function editCollectionSpaces(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    // Skapa en dialog för att välja spaces
    const availableSpaces = bookmarkManagerData.spaces || ['Everything'];
    const currentSpaces = collection.spaces || ['Everything'];
    
    // Kontrollera om dark mode är aktivt för labels
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
    
    // Använd samma isDarkMode variabel för dialog
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
    
    // Add hover effects for buttons
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
    
    // Add event listeners
    document.getElementById('saveSpaces').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#spacesDialog input[type="checkbox"]');
        const selectedSpaces = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Always ensure Everything is included
        if (!selectedSpaces.includes('Everything')) {
            selectedSpaces.unshift('Everything');
        }
        
        collection.spaces = selectedSpaces;
        collection.lastModified = Date.now();
        saveToLocalStorage();
        renderCollections();
        
        // Remove dialog
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
            renderCollections();
        }
    }
}

// Uppdaterad funktion för att lägga till ett bokmärke
async function addBookmark(collectionId) {
    try {
        const title = prompt('Enter bookmark title:');        
        const url = prompt('Enter bookmark URL:', 'https://');
        const description = prompt('Enter bookmark description:');
        const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
        if (title && url) {
            const icon = await getFavicon(url);
            const newBookmark = {
                id: generateUUID(),
                title: title,
                url: url,
                description: description,
                icon: icon,
                lastModified: Date.now(),
                deleted: false,
                position: collection.bookmarks.length
            };
            
            if (collection) {
                collection.bookmarks.push(newBookmark);
                collection.lastModified = Date.now();
                renderCollections();
            }           
        }
    } catch (error) {
        handleBookmarkError(error);
    }
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

// Uppdaterad funktion för att redigera ett bokmärke
async function editBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;
    
    // Kontrollera om dark mode är aktivt
    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const inputBg = isDarkMode ? '#3a3a3a' : 'white';
    const inputBorder = isDarkMode ? '#555' : '#ccc';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';
    
    // Skapa overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    // Skapa dialog
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
    
    // Lägg till CSS animation (kolla om den redan finns)
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
    
    // Hämta input element
    const titleInput = dialog.querySelector('#bookmarkTitleInput');
    const urlInput = dialog.querySelector('#bookmarkUrlInput');
    const descInput = dialog.querySelector('#bookmarkDescInput');
    const cancelBtn = dialog.querySelector('#cancelEditBookmark');
    const saveBtn = dialog.querySelector('#saveEditBookmark');
    
    // Fokusera på title input och markera text
    setTimeout(() => {
        titleInput.focus();
        titleInput.select();
    }, 100);
    
    // Lägg till hover effects
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
    
    // Focus effects för inputs
    [titleInput, urlInput, descInput].forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#4CAF50';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = inputBorder;
        });
    });
    
    // Event handlers
    function closeDialog() {
        document.body.removeChild(overlay);
    }
    
    async function saveBookmark() {
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();
        const newDescription = descInput.value.trim();
        
        if (!newTitle || !newUrl) {
            // Highlighta fält som saknas
            if (!newTitle) {
                titleInput.style.borderColor = '#f44336';
                titleInput.focus();
            } else if (!newUrl) {
                urlInput.style.borderColor = '#f44336';
                urlInput.focus();
            }
            return;
        }
        
        // Visa loading state
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        saveBtn.style.background = '#666';
        
        try {
            // Hämta favicon om URL har ändrats
            let newIcon = bookmark.icon;
            if (newUrl !== bookmark.url) {
                newIcon = await getFavicon(newUrl);
            }
            
            // Uppdatera bookmark
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
            
            // Visa error på URL fältet
            urlInput.style.borderColor = '#f44336';
            urlInput.focus();
        }
    }
    
    // Button events
    cancelBtn.addEventListener('click', closeDialog);
    saveBtn.addEventListener('click', saveBookmark);
    
    // Keyboard shortcuts
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveBookmark();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog();
        }
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
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
    // Kontrollera om dark mode är aktivt
    const isDarkMode = document.body.classList.contains('dark-mode');
    const dialogBg = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const subtitleColor = isDarkMode ? '#999' : '#666';
    const cancelBg = isDarkMode ? '#444' : '#f0f0f0';
    const cancelTextColor = isDarkMode ? '#e0e0e0' : '#333';
    
    // Skapa overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    // Skapa dialog
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
            ">⚠️</div>
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
    
    // Lägg till CSS animation om den inte redan finns
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
    
    // Hämta knappar
    const cancelBtn = dialog.querySelector('#cancelDelete');
    const confirmBtn = dialog.querySelector('#confirmDelete');
    
    // Fokusera på Cancel-knappen (säkrare standard)
    setTimeout(() => {
        cancelBtn.focus();
    }, 100);
    
    // Hover effects
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
    
    // Event handlers
    function closeDialog() {
        document.body.removeChild(overlay);
    }
    
    function handleConfirm() {
        closeDialog();
        if (onConfirm) onConfirm();
    }
    
    // Button events
    cancelBtn.addEventListener('click', closeDialog);
    confirmBtn.addEventListener('click', handleConfirm);
    
    // Keyboard shortcuts
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Bekräfta bara om Delete-knappen har fokus
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
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}

// Uppdaterad openBookmark funktion
function openBookmark(collectionId, bookmarkId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (collection) {
        const bookmark = collection.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
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
        const urls = collection.bookmarks.filter(b => !b.deleted).map(bookmark => bookmark.url);
        const extensionId = extId; // Ersätt med ditt extension-ID
    
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
        console.log('Starting collection drag, calling showSpaceDropZones'); // Debug log
        showSpaceDropZones();
    } else {
        console.warn('Collection element not found for drag start');
    }
}

// Uppdaterad dragStartBookmark funktion
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
    console.log('Drag ended, draggedItem reset');
}

// Uppdaterad dragOverCollection funktion
function dragOverCollection(e) {
    if (!draggedItem) {
        return;
    }
    
    // Låt Chrome Groups och Windows bubbla vidare till rätt handler
    if (draggedItem.type === 'chromeTabGroup' || 
        draggedItem.type === 'chromeWindow' || 
        draggedItem.type === 'chromeTab') {
            e.stopPropagation();
        e.preventDefault(); // Tillåt drop av tab-grupper
        return;
    }
    
    if (draggedItem.type !== 'collection') {
        return;
    }
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Hitta collections container
    const collectionsContainer = document.getElementById('collections');
    const collections = Array.from(collectionsContainer.querySelectorAll('.collection:not(.dragging)'));
    
    // Beräkna Y-position för muspekaren relativt till collections container
    const mouseY = e.clientY;
    
    // Hitta närmaste collection baserat på musposition
    let closestCollection = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    let shouldPlaceBefore = true;

    collections.forEach(collection => {
        const rect = collection.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const offset = mouseY - centerY;

        // Uppdatera closest om vi hittar en collection som är närmare
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

    // Ta bort existerande placeholder
    if (placeholder) {
        placeholder.remove();
    }

    // Skapa ny placeholder
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }

    // Placera placeholder på rätt plats
    if (!closestCollection) {
        // Om ingen närmare collection hittades, lägg till sist
        collectionsContainer.appendChild(placeholder);
    } else if (shouldPlaceBefore) {
        closestCollection.parentNode.insertBefore(placeholder, closestCollection);
    } else {
        closestCollection.parentNode.insertBefore(placeholder, closestCollection.nextSibling);
    }
}

// Uppdaterad dropCollection funktion
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

    // Ta bort collection från sin nuvarande position
    const [movedCollection] = collections.splice(droppedIndex, 1);

    // Hitta den nya positionen baserat på placeholder
    if (placeholder && placeholder.parentNode) {
        const allCollections = Array.from(document.querySelectorAll('.collection'));
        const placeholderIndex = Array.from(placeholder.parentNode.children)
            .filter(el => el.classList.contains('collection') || el === placeholder)
            .indexOf(placeholder);

        // Justera index om den dragna collection var före placeholder
        const adjustedIndex = placeholderIndex < droppedIndex ? placeholderIndex : placeholderIndex - 1;
        
        // Sätt in collection på den nya positionen
        collections.splice(adjustedIndex, 0, movedCollection);
        movedCollection.lastModified = Date.now();
    } else {
        // Om ingen placeholder hittas, lägg till sist
        collections.push(movedCollection);
        movedCollection.lastModified = Date.now();
    }

    // Rensa upp och rendera om
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
    if (draggedItem && 
        (draggedItem.type === 'bookmark' || 
         draggedItem.type === 'chromeTab' || 
         draggedItem.type === 'chromeWindow' || 
         draggedItem.type === 'chromeTabGroup')) {
        this.classList.add('drag-over');
    }
}

function dragLeaveBookmarkContainer(e) {
    this.classList.remove('drag-over');
}

// Uppdaterad dragOverBookmark funktion
// Uppdaterad dragOverBookmark med bättre hantering av direktöverlappning
function dragOverBookmark(e) {
    if (!draggedItem) return;
    
    // Låt Chrome Groups och Windows bubbla vidare till rätt handler
    if (draggedItem.type === 'chromeTabGroup' || 
        draggedItem.type === 'chromeWindow' || 
        draggedItem.type === 'chromeTab') {
        e.preventDefault(); // Tillåt drop av tab-grupper
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

    // Ta bort befintlig placeholder
    if (placeholder && placeholder.parentNode === container) {
        container.removeChild(placeholder);
    }

    // Skapa ny placeholder om det behövs
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.style.height = `${rect.height}px`;
    }

    // Bestäm placering
    const insertPosition = isBefore ? targetIndex : targetIndex + 1;
    
    // Förhindra att placera i samma position
    if (allBookmarks[insertPosition] === draggedItem.element) return;

    container.insertBefore(placeholder, allBookmarks[insertPosition] || null);
}

// Förbättrad dropBookmark som hanterar direktöverlappning
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
    const allBookmarks = Array.from(container.children).filter(el => el.classList.contains('bookmark'));
    
    // Hämta insert-position baserat på placeholder eller musposition
    let dropIndex = Array.from(container.children).indexOf(placeholder);
    
    // Fallback: Beräkna position baserat på muskoordinater
    if (dropIndex === -1) {
        const containerRect = container.getBoundingClientRect();
        const yPos = e.clientY - containerRect.top;
        dropIndex = Math.floor((yPos / containerRect.height) * toCollection.bookmarks.length);
    }

    // Begränsa index till giltigt intervall
    dropIndex = Math.max(0, Math.min(dropIndex, toCollection.bookmarks.length));

    // Uppdatera positioner
    movedBookmark.parentCollection = toCollectionId;
    movedBookmark.lastModified = Date.now();
    
    toCollection.bookmarks.splice(dropIndex, 0, movedBookmark);
    toCollection.lastModified = Date.now();

    // Uppdatera alla positioner
    toCollection.bookmarks.forEach((bookmark, index) => {
        bookmark.position = index;
    });

    // Rensa placeholder
    if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
    }

    renderCollections();
    saveToLocalStorage();
    draggedItem = null;
}

// Updated dropBookmark function with proper position recalculation


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
                    icon: tab.favIconUrl || 'default-icon.png',
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
                    icon: tab.favIconUrl || 'default-icon.png',
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
                icon: draggedItem.data.icon || 'default-icon.png',
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



// Ny funktion för att skapa Chrome-flik element
function createChromeTabElement(tab, windowId) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab';
    tabDiv.draggable = true;
    tabDiv.dataset.windowId = windowId;
    tabDiv.dataset.tabId = tab.id;

    const tabIcon = document.createElement('img');
    tabIcon.src = tab.favIconUrl || 'default-icon.png';
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

    // Skicka ett meddelande till background.js vid klick
    tabDiv.addEventListener('click', () => {
        //if (!draggedItem) {
            chrome.runtime.sendMessage({
                action: 'switchToTab',
                tabId: tab.id,
                windowId: windowId
            });
        //}
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

                    ungroupedTabs.className = 'ungrouped-tabs';
                    ungroupedTabs.forEach(tabData => {
                        const tabDiv = createChromeTabElement({
                            id: tabData.tabId,
                            title: tabData.title,
                            url: tabData.url,
                            favIconUrl: tabData.favIconUrl
                        }, windowData.windowId);
                        tabsList.appendChild(tabDiv);
                    });

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


document.getElementById('addCollection').addEventListener('click', addCollection);
document.getElementById('openInNewTab').addEventListener('change', (e) => {
    openInNewTab = e.target.checked;
    saveToLocalStorage();
});

document.getElementById('closeWhenSaveTab').addEventListener('change', (e) => {
    bookmarkManagerData.closeWhenSaveTab = e.target.checked;
    saveToLocalStorage();
});

document.getElementById('importTobyFile').addEventListener('change', importTobyBookmarks);

// Funktion för att lägga till drag-and-drop lyssnare på bokmärken
function addBookmarkDragListeners(bookmarkElement) {
    bookmarkElement.addEventListener('dragstart', dragStartBookmark);
    bookmarkElement.addEventListener('dragend', dragEnd);
    bookmarkElement.addEventListener('dragover', dragOverBookmark);
    bookmarkElement.addEventListener('drop', dropBookmark);
}

/*function setupGlobalDragListeners() {
    document.addEventListener('dragstart', (e) => {
        console.log('Global dragstart event:', e.target);
    }, true);

    document.addEventListener('dragend', (e) => {
        console.log('Global dragend event:', e.target);
        if (!draggedItem) {
            console.warn('draggedItem was null at dragend');
        }
    }, true);

    document.addEventListener('drop', (e) => {
        console.log('Global drop event:', e.target);
        if (!draggedItem) {
            console.warn('draggedItem was null at drop');
        }
    }, true);
}

// Anropa denna funktion när sidan laddas
document.addEventListener('DOMContentLoaded', setupGlobalDragListeners);
*/
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
    renderCollections();
    fetchChromeTabs();
    setInterval(fetchChromeTabs, 5000);

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
    
    // Debug function to verify spaces sync
    window.debugSpacesSync = function() {
        const collections = bookmarkManagerData.collections.filter(c => !c.deleted);
        console.log('Collections with spaces:');
        collections.forEach(c => {
            console.log(`Collection "${c.name}": spaces=${JSON.stringify(c.spaces)}, lastModified=${new Date(c.lastModified).toISOString()}`);
        });
    };

    // Left pane tabs functionality
    initializeLeftPaneTabs();

    // Funktion för att uppdatera sync-knappens synlighet
    function updateSyncButtonVisibility() {
        const syncButton = document.getElementById('syncButton');
        syncButton.style.display = isGitHubConfigValid() ? 'flex' : 'none';
    }

    // Initialisera GitHub-fälten och sync-knappens synlighet
    document.getElementById('githubUsername').value = bookmarkManagerData.githubConfig.username || '';
    document.getElementById('githubRepo').value = bookmarkManagerData.githubConfig.repo || '';
    document.getElementById('githubPat').value = bookmarkManagerData.githubConfig.pat || '';
    updateSyncButtonVisibility();


    const searchBox = document.getElementById('searchBox');    
    if (searchBox) {
        setTimeout(() => {
            console.log('Focusing on search box');
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
                // Removed persistent update: collectionData.isOpen is no longer modified during filtering.
                // if (collectionData) collectionData.isOpen = true;
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
    
    bookmarkManagerData.spaces.forEach(spaceName => {
        const spaceItem = document.createElement('div');
        spaceItem.className = 'space-item';
        if (spaceName === bookmarkManagerData.currentSpace) {
            spaceItem.classList.add('active');
        }
        
        spaceItem.innerHTML = `
            <span class="space-name">${spaceName}</span>
            ${spaceName !== 'Everything' ? '<button class="delete-space-btn" data-space="' + spaceName + '">×</button>' : ''}
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
    
    if (bookmarkManagerData.spaces.includes(spaceName)) {
        alert('A space with this name already exists');
        return;
    }
    
    // Add the space
    bookmarkManagerData.spaces.push(spaceName);
    saveToLocalStorage();
    
    // Clear input and re-render
    newSpaceNameInput.value = '';
    renderSpaces();
}

function deleteSpace(spaceName) {
    if (spaceName === 'Everything') {
        alert('Cannot delete the "Everything" space');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the space "${spaceName}"?`)) {
        // Remove from spaces array
        const index = bookmarkManagerData.spaces.indexOf(spaceName);
        if (index > -1) {
            bookmarkManagerData.spaces.splice(index, 1);
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
    
    if (!bookmarkManagerData.spaces.includes('Everything')) {
        bookmarkManagerData.spaces.unshift('Everything');
    }
    
    // Ensure currentSpace is set
    if (!bookmarkManagerData.currentSpace || !bookmarkManagerData.spaces.includes(bookmarkManagerData.currentSpace)) {
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
            minute: '2-digit',
            hour12: false 
        };
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        timeElement.textContent = now.toLocaleTimeString('sv-SE', timeOptions);
        dateElement.textContent = now.toLocaleDateString('sv-SE', dateOptions);
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

