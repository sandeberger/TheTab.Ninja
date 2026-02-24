/**
 * utils.js - Utility functions for TheTab.Ninja
 * Pure helper functions with no side effects.
 */

// Generate unique UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate unique collection name (avoids duplicates)
function generateUniqueCollectionName(baseName) {
    if (!baseName || baseName.trim() === '') {
        baseName = 'New Collection';
    }

    let name = baseName;
    let counter = 2;

    while (bookmarkManagerData.collections.some(c => !c.deleted && c.name.toLowerCase() === name.toLowerCase())) {
        name = `${baseName}${counter}`;
        counter++;
    }

    return name;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Debounce function to limit event firing frequency
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
