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

// Debounce function to limit event firing frequency
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
