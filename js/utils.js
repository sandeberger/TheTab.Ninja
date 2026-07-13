/**
 * utils.js - Utility functions for TheTab.Ninja
 * Pure helper functions with no side effects.
 */

// HTML escape function to prevent XSS when inserting user data into innerHTML
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Generate unique UUID using crypto API
function generateUUID() {
    return crypto.randomUUID();
}

// Generate unique collection name (avoids duplicates)
function generateUniqueCollectionName(baseName) {
    if (!baseName || baseName.trim() === '') {
        baseName = 'New Collection';
    }

    let name = baseName;
    let counter = 2;

    while (bookmarkManagerData.collections.some(c => !c.deleted && c.name && c.name.toLowerCase() === name.toLowerCase())) {
        name = `${baseName}${counter}`;
        counter++;
    }

    return name;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Debounce function to limit event firing frequency (supports .cancel())
function debounce(func, wait) {
    let timeout;
    function executedFunction(...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    }
    executedFunction.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };
    return executedFunction;
}

// Generate a fun, memorable name for a Chrome window ID
// Uses deterministic hashing so the same windowId always gets the same name
function generateWindowName(windowId) {
    const adjectives = [
        'Peppy', 'Snappy', 'Zippy', 'Breezy', 'Chirpy', 'Dapper', 'Fizzy', 'Groovy',
        'Jazzy', 'Keen', 'Lively', 'Merry', 'Nimble', 'Plucky', 'Quick', 'Radiant',
        'Sleek', 'Turbo', 'Vivid', 'Witty', 'Zesty', 'Bold', 'Cosmic', 'Daring',
        'Epic', 'Fierce', 'Golden', 'Happy', 'Icy', 'Jolly', 'Lucky', 'Mighty',
        'Noble', 'Pixel', 'Royal', 'Sonic', 'Tidal', 'Ultra', 'Velvet', 'Warp',
        'Amber', 'Blaze', 'Crystal', 'Dreamy', 'Ember', 'Flash', 'Gleam', 'Hyper',
        'Ivory', 'Jade', 'Kinetic', 'Lunar', 'Mystic', 'Neon', 'Orbit', 'Prism',
        'Quantum', 'Ruby', 'Storm', 'Thunder'
    ];
    const nouns = [
        'Phoenix', 'Falcon', 'Panda', 'Tiger', 'Dolphin', 'Eagle', 'Jaguar', 'Koala',
        'Lynx', 'Mustang', 'Otter', 'Raven', 'Sparrow', 'Wolf', 'Fox', 'Hawk',
        'Lion', 'Panther', 'Viper', 'Cobra', 'Condor', 'Dragon', 'Griffin', 'Heron',
        'Iguana', 'Jackal', 'Kestrel', 'Leopard', 'Moose', 'Narwhal', 'Osprey', 'Pelican',
        'Quail', 'Raptor', 'Salmon', 'Toucan', 'Urchin', 'Vulture', 'Wombat', 'Yak',
        'Badger', 'Cheetah', 'Dingo', 'Elk', 'Ferret', 'Gazelle', 'Husky', 'Ibis',
        'Jellyfish', 'Kingfisher', 'Lemur', 'Manta', 'Newt', 'Octopus', 'Puffin', 'Robin',
        'Starling', 'Turtle', 'Unicorn', 'Walrus'
    ];
    // Simple hash from window ID
    let hash = 0;
    const idStr = String(windowId);
    for (let i = 0; i < idStr.length; i++) {
        hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;
    }
    hash = Math.abs(hash);
    const adj = adjectives[hash % adjectives.length];
    const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length];
    return `${adj} ${noun}`;
}

// True for browser-internal pages that cannot be bookmarked/reopened
// (Chrome: chrome://, Firefox: about:, moz-extension://)
function isBrowserInternalUrl(url) {
    if (!url) return true;
    return url.startsWith('chrome://') ||
           url.startsWith('about:') ||
           url.startsWith('moz-extension://') ||
           url.startsWith('edge://');
}

// Promise-based wrapper for chrome.runtime.sendMessage
function sendMessageAsync(message) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(response);
            });
        } catch (error) {
            reject(error);
        }
    });
}
