# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TheTab.Ninja is a Chrome browser extension that transforms the new tab page into a customizable bookmark manager. The extension allows users to:

- Manage bookmarks in collections with drag-and-drop functionality
- Sync data via GitHub repositories (no external servers)
- Import bookmarks from other tools like Toby
- Manage Chrome tabs and tab groups directly from the new tab page

## Architecture

### Core Files Structure

- `manifest.json` - Chrome extension manifest (v3)
- `bm.html` / `bm.js` - Main new tab page interface and logic
- `popup.html` / `popup.js` - Extension popup for saving current tab
- `background.js` - Service worker handling GitHub sync, tab management, favicon fetching
- `styles.css` - UI styling including dark mode support

### Key Components

#### Data Management
- All data stored in `localStorage` as `bookmarkManagerData` object
- Collections contain bookmarks with soft-delete functionality (deleted flag)
- GitHub sync uses Git API for remote storage without external dependencies

#### Drag & Drop System
- Comprehensive drag-and-drop between collections, bookmarks, and Chrome tabs
- Supports moving bookmarks between collections
- Can import Chrome tabs/tab groups directly into collections

#### Chrome Integration
- Background service worker communicates with content scripts
- Tab management through Chrome APIs (tabs, windows, tabGroups)
- Favicon fetching via Google's favicon service

## Data Structure

### Main Data Object
```javascript
bookmarkManagerData = {
    collections: [],           // Array of collection objects
    openInNewTab: false,      // User preference for bookmark opening
    closeWhenSaveTab: false,  // Auto-close tabs when saving
    darkMode: false,          // UI theme preference
    leftPaneOpen: true,       // UI state
    rightPaneOpen: true,      // UI state
    githubConfig: {           // Sync configuration
        username: '',
        repo: '',
        pat: '',             // Personal access token
        filepath: 'bookmarks.json'
    }
}
```

### Collection Structure
```javascript
{
    id: "uuid",
    name: "Collection Name",
    isOpen: true,            // Expanded/collapsed state
    lastModified: timestamp,
    deleted: false,          // Soft delete flag
    position: 0,            // Display order
    bookmarks: []           // Array of bookmark objects
}
```

### Bookmark Structure
```javascript
{
    id: "uuid",
    title: "Bookmark Title",
    url: "https://example.com",
    description: "Optional description",
    icon: "favicon-url",
    lastModified: timestamp,
    deleted: false,         // Soft delete flag
    position: 0            // Order within collection
}
```

## Development Workflow

This is a pure client-side Chrome extension with no build process or external dependencies. Development workflow:

1. Make changes to source files directly
2. Load unpacked extension in Chrome for testing
3. Use Chrome DevTools for debugging

### Testing the Extension
- Load as unpacked extension in Chrome Developer mode
- Refresh extension after code changes
- Check console in both extension context and new tab page

### Key Functions to Understand

#### GitHub Sync (`bm.js`)
- `synchronizeWithGitHub()` - Main sync function with conflict resolution
- `mergeDatasets()` - Handles data merging between local and remote
- `fetchFromGitHub()` / `pushToGitHub()` - API communication via background script

#### Drag & Drop (`bm.js`)
- `dragStartBookmark()` / `dropBookmark()` - Bookmark movement
- `dragStartCollection()` / `dropCollection()` - Collection reordering
- `fetchAllTabs()` - Import Chrome tabs into collections

#### Data Persistence
- `saveToLocalStorage()` / `loadFromLocalStorage()` - Local data management
- `enrichCollection()` / `enrichBookmark()` - Ensure data structure integrity

## Search Functionality

The extension includes powerful search with special operators:
- `#term` - Search collection names only
- `%term` - Global search (collections + bookmarks)
- `term1|term2` - OR search with pipe separator
- Regular search filters bookmarks within collections

## Extension Permissions

Required Chrome permissions:
- `tabs` - Tab management and reading tab information
- `windows` - Window management for tab grouping
- `tabGroups` - Creating and managing tab groups
- Host permissions for favicon fetching and GitHub API

## Common Development Tasks

### Adding New Features
1. Identify if feature needs background script communication
2. Update data structure if needed (`bookmarkManagerData`)
3. Add UI components in `bm.html` and corresponding logic in `bm.js`
4. Test drag-and-drop interactions if applicable
5. Ensure GitHub sync compatibility

### Debugging Issues
- Check browser console for both extension and new tab page contexts
- Verify `localStorage` data structure using DevTools
- Test with different bookmark/collection configurations
- Check Chrome extension error logs in `chrome://extensions`

### Data Migration
When modifying data structures, ensure backward compatibility in `loadFromLocalStorage()` and `enrichCollection()`/`enrichBookmark()` functions.

## Important Notes

- No package.json or build tools - this is a vanilla JavaScript project
- All external communication goes through background service worker
- Soft deletes preserve data for sync conflict resolution
- Search functionality modifies UI state but not underlying data
- GitHub sync requires user's own repository and personal access token