/**
 * favicon.js - Favicon handling, validation, and error recovery
 * Manages favicon URL cleanup, fallback mechanisms, and global error handlers.
 */

// Cache for getSafeIconUrl results to avoid re-processing the same URLs
const _safeIconUrlCache = new Map();

// Single regex for all problematic favicon URL patterns
const _problematicFaviconPattern = /faviconV2\?client=SOCIAL|t[0-3]\.gstatic\.com\/faviconV2|fallback_opts=TYPE,SIZE,URL/;

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

    // Check cache first
    const cached = _safeIconUrlCache.get(iconUrl);
    if (cached !== undefined) {
        return cached;
    }

    let result = iconUrl;

    // If URL contains problematic patterns, replace with safe Google favicon service
    if (_problematicFaviconPattern.test(iconUrl)) {
        try {
            const urlMatch = iconUrl.match(/url=([^&]+)/);
            if (urlMatch) {
                const decodedUrl = decodeURIComponent(urlMatch[1]);
                const domain = new URL(decodedUrl).hostname;
                const safeUrl = new URL('https://www.google.com/s2/favicons');
                safeUrl.searchParams.set('domain', domain);
                safeUrl.searchParams.set('sz', '32');
                result = safeUrl.toString();
            } else {
                result = FALLBACK_ICON;
            }
        } catch (e) {
            result = FALLBACK_ICON;
        }
    }

    // Cache the result (cap at 5000 entries to prevent unbounded growth)
    if (_safeIconUrlCache.size > 5000) {
        _safeIconUrlCache.clear();
    }
    _safeIconUrlCache.set(iconUrl, result);
    return result;
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
