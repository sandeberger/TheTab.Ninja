/**
 * background-manager.js - Custom background image management
 * Handles uploading, storing, and selecting custom background images.
 */

// Load custom backgrounds from localStorage
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

// Save custom backgrounds to localStorage
function saveCustomBackgrounds(data) {
    localStorage.setItem('customBackgroundImages', JSON.stringify(data));
}

// Initialize custom backgrounds
function initCustomBackgrounds() {
    const customData = loadCustomBackgrounds();
    renderCustomBackgroundThumbnails();

    if (customData.activeBackground === 'custom' && customData.activeImageId) {
        const customImage = customData.customImages[customData.activeImageId];
        if (customImage) {
            setBackground(customImage.dataUrl, 'custom');
        }
    }
}

// Render custom background thumbnails
function renderCustomBackgroundThumbnails() {
    const customData = loadCustomBackgrounds();
    const container = document.getElementById('customBackgroundThumbnails');
    if (!container) return;

    container.innerHTML = '';

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

    Object.values(customData.customImages).forEach(image => {
        const thumbnail = createCustomThumbnail(image);
        container.appendChild(thumbnail);
    });
}

// Create a custom thumbnail element
function createCustomThumbnail(image) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'background-thumbnail custom-thumbnail';
    thumbnail.dataset.imageId = image.id;

    thumbnail.innerHTML = `
        <img src="${image.dataUrl}" alt="${image.name}">
        <div class="custom-thumbnail-overlay">
            <button class="remove-custom-bg" title="Ta bort">\u00D7</button>
        </div>
    `;

    thumbnail.addEventListener('click', (e) => {
        if (!e.target.classList.contains('remove-custom-bg')) {
            console.log('Klickade p\u00E5 anpassad bakgrund:', image.id);
            setCustomBackground(image.id);
        }
    });

    const removeButton = thumbnail.querySelector('.remove-custom-bg');
    if (removeButton) {
        removeButton.addEventListener('click', (e) => {
            console.log('Klickade p\u00E5 ta bort knapp:', image.id);
            e.stopPropagation();
            removeCustomBackground(image.id);
        });
    }

    return thumbnail;
}

// Handle custom background file upload
async function handleCustomBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png)/)) {
        alert('Only JPEG and PNG files are allowed.');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5MB.');
        return;
    }

    try {
        const compressedDataUrl = await compressImage(file);

        const sizeInBytes = compressedDataUrl.length * 0.75;
        if (sizeInBytes > 500 * 1024) {
            alert('Image is too large after compression. Try a smaller image.');
            return;
        }

        const customData = loadCustomBackgrounds();

        if (Object.keys(customData.customImages).length >= 5) {
            alert('You can have a maximum of 5 custom background images. Remove an existing one first.');
            return;
        }

        const imageId = 'custom_' + Date.now();
        const imageName = file.name.replace(/\.[^/.]+$/, '');

        customData.customImages[imageId] = {
            id: imageId,
            name: imageName,
            dataUrl: compressedDataUrl,
            uploadDate: Date.now()
        };

        saveCustomBackgrounds(customData);
        renderCustomBackgroundThumbnails();

        event.target.value = '';

        console.log('Custom background uploaded:', imageName);
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('An error occurred while uploading the image. Please try again.');
    }
}

// Compress an image file
function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = function() {
            let { width, height } = img;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
        };

        img.onerror = function() {
            reject(new Error('Could not load the image'));
        };

        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error('Could not read the file'));
        };
        reader.readAsDataURL(file);
    });
}

// Set a custom background as active
function setCustomBackground(imageId) {
    console.log('setCustomBackground called for:', imageId);
    const customData = loadCustomBackgrounds();
    const image = customData.customImages[imageId];

    if (!image) {
        console.error('Custom background image not found:', imageId);
        return;
    }

    customData.activeBackground = 'custom';
    customData.activeImageId = imageId;
    saveCustomBackgrounds(customData);

    setBackground(image.dataUrl, 'custom');

    localStorage.setItem('backgroundImage', 'custom_' + imageId);

    document.querySelectorAll('.background-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });

    const customThumbnail = document.querySelector(`[data-image-id="${imageId}"]`);
    if (customThumbnail) {
        customThumbnail.classList.add('selected');
        console.log('Marked custom thumbnail as selected:', imageId);
    } else {
        console.warn('Could not find thumbnail for:', imageId);
    }
}

// Remove a custom background
function removeCustomBackground(imageId) {
    console.log('removeCustomBackground called for:', imageId);

    if (!confirm('Are you sure you want to remove this background image?')) {
        console.log('User cancelled removal');
        return;
    }

    try {
        const customData = loadCustomBackgrounds();

        if (!customData.customImages[imageId]) {
            console.error('Image not found:', imageId);
            alert('The image could not be found.');
            return;
        }

        delete customData.customImages[imageId];
        console.log('Image removed from data:', imageId);

        if (customData.activeBackground === 'custom' && customData.activeImageId === imageId) {
            customData.activeBackground = 'predefined';
            customData.activeImageId = null;

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

            if (backgroundImages.length > 0) {
                setBackground(backgroundImages[0]);
                localStorage.setItem('backgroundImage', backgroundImages[0]);
            }
            console.log('Switched to default background');
        }

        saveCustomBackgrounds(customData);
        renderCustomBackgroundThumbnails();

        console.log('Custom background removed successfully:', imageId);
    } catch (error) {
        console.error('Error removing background image:', error);
        alert('An error occurred while removing the background image.');
    }
}

// Update thumbnail selection state
function updateThumbnailSelection(imageId, type) {
    document.querySelectorAll('.background-thumbnail').forEach(thumb => {
        thumb.classList.remove('selected');
    });

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
