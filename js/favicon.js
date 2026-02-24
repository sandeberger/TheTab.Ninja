/**
 * favicon.js - Favicon handling, validation, and error recovery
 * Manages favicon URL cleanup, fallback mechanisms, and global error handlers.
 */

// Function to validate and clean favicon URLs
function getSafeIconUrl(iconUrl) {
    // Return fallback immediately if no URL provided
    if (!iconUrl || iconUrl === 'assets/icons/default-icon.png') {
        return FALLBACK_ICON;
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
                return FALLBACK_ICON;
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
            e.target.src = FALLBACK_ICON_LIGHT;
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

// Find favicon by testing multiple potential paths
function findFavicon(url, callback) {
    const baseUrl = url.replace(/\/$/, '');

    const potentialFavicons = [
        `${baseUrl}/favicon.ico`,
        `${baseUrl}/favicon.png`,
        `${baseUrl}/favicon.gif`,
        `${baseUrl}/favicon.jpg`,
        `${baseUrl}/favicon.svg`,
        `${baseUrl}/apple-touch-icon.png`,
        `${baseUrl}/android-chrome-192x192.png`,
        `${baseUrl}/mstile-150x150.png`,
    ];

    let found = false;

    function testNext() {
        if (potentialFavicons.length === 0) {
            callback(null);
            return;
        }

        const faviconUrl = potentialFavicons.shift();
        const img = new Image();

        img.onload = function() {
            if (!found) {
                found = true;
                callback(faviconUrl);
            }
        };

        img.onerror = function() {
            if (!found) {
                testNext();
            }
        };

        img.src = faviconUrl;
    }

    testNext();
}

// Get favicon via background service worker
function getFavicon(url) {
    const extensionId = extId;
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Favicon fetch timeout'));
        }, 5000);

        chrome.runtime.sendMessage({ action: 'fetchFavicon', url }, (response) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
                const fallbackUrl = FALLBACK_ICON;
                resolve(fallbackUrl);
                return;
            }

            if (response && response.faviconUrl) {
                resolve(response.faviconUrl);
            } else {
                const fallbackUrl = FALLBACK_ICON;
                resolve(fallbackUrl);
            }
        });
    });
}
