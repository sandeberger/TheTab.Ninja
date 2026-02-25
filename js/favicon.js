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
                    // Build URL safely using URL constructor
                    const safeUrl = new URL('https://www.google.com/s2/favicons');
                    safeUrl.searchParams.set('domain', domain);
                    safeUrl.searchParams.set('sz', '32');
                    return safeUrl.toString();
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
        bookmarks: (collection.bookmarks || []).map(bookmark => ({
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
            const cleanedBookmarks = (collection.bookmarks || []).map(bookmark => {
                const originalIcon = bookmark.icon;
                const cleanedIcon = getSafeIconUrl(bookmark.icon);

                if (originalIcon !== cleanedIcon) {
                    hasChanges = true;
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
        saveToLocalStorage();
    }
}

// Global error handling for resource loading - only for favicon images
window.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'IMG') {
        const src = e.target.src;
        // Only handle favicon-related image errors, not wallpapers/backgrounds
        const isFavicon = e.target.closest('.bookmark, .tab-item, .chrome-tab') ||
                          src.includes('favicon') || src.includes('s2/favicons') ||
                          src.includes('gstatic.com');

        if (!isFavicon) return; // Let non-favicon image errors propagate normally

        e.preventDefault();
        e.stopPropagation();

        if (!e.target.dataset.fallbackApplied) {
            e.target.dataset.fallbackApplied = 'true';
            e.target.src = FALLBACK_ICON_LIGHT;
        }
        return false;
    }
}, true);

// Suppress unhandled promise rejection warnings for favicon fetches only
window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message &&
        (e.reason.message === 'Favicon fetch timeout' ||
         e.reason.message.startsWith('Favicon '))) {
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
        if (potentialFavicons.length === 0 || found) {
            if (!found) callback(null);
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

// Get favicon via background service worker (with graceful degradation)
function getFavicon(url) {
    return new Promise((resolve) => {
        let settled = false;

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(FALLBACK_ICON);
            }
        }, 5000);

        try {
            chrome.runtime.sendMessage({ action: 'fetchFavicon', url }, (response) => {
                clearTimeout(timeout);
                if (settled) return;
                settled = true;

                if (chrome.runtime.lastError || !response || !response.faviconUrl) {
                    resolve(FALLBACK_ICON);
                    return;
                }
                resolve(response.faviconUrl);
            });
        } catch (e) {
            clearTimeout(timeout);
            if (!settled) {
                settled = true;
                resolve(FALLBACK_ICON);
            }
        }
    });
}
