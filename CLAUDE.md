# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TheTab.Ninja is a Chrome browser extension that transforms the new tab page into a customizable bookmark manager. The extension allows users to:

- Manage bookmarks in collections with drag-and-drop functionality
- Sync data via GitHub repositories (no external servers)
- Import bookmarks from other tools like Toby
- Manage Chrome tabs and tab groups directly from the new tab page
- Organize collections into workspaces using Spaces management
- Use Zen Mode for distraction-free browsing with elegant clock display
- Sort collections by name, last modified, or custom order
- Customize background with predefined wallpapers or custom images
- Access quick search shortcuts for Google and ChatGPT
- Enjoy responsive mobile design with touch-optimized interface

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
- Spaces management with object format and soft-delete capability
- GitHub sync uses Git API for remote storage without external dependencies
- Enhanced security with robust merge conflict resolution

#### Drag & Drop System
- Comprehensive drag-and-drop between collections, bookmarks, and Chrome tabs
- Supports moving bookmarks between collections
- Can import Chrome tabs/tab groups directly into collections
- Drag collections between different spaces
- Collection reordering with position management

#### Chrome Integration
- Background service worker communicates with content scripts
- Tab management through Chrome APIs (tabs, windows, tabGroups)
- Favicon fetching via Google's favicon service

#### Zen Mode
- Distraction-free browsing experience with minimalist interface
- Elegant clock display with date/time
- Dedicated search functionality with smooth animations
- Keyboard navigation with Escape key handling
- Automatic disable on mobile devices for optimal UX

#### Mobile Responsive Design
- Touch-optimized interface for mobile devices
- Responsive layout that adapts to different screen sizes
- Mobile-specific button designs (icon-only for space efficiency)
- Pane toggle system for easy navigation
- Optimized viewport handling for mobile browsers

#### Custom Background System
- Predefined wallpaper gallery with multiple options
- Custom image upload functionality with data URL storage
- Background sync across devices via GitHub
- Thumbnail management with selection states
- Remove custom backgrounds with confirmation dialogs

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
    zenMode: false,           // Zen mode preference
    spaces: ['Everything'],   // Array of space objects (with soft delete)
    currentSpace: 'Everything', // Currently selected space
    collectionSortOrder: 'userdefined', // Collection sorting preference
    activeLeftTab: 'spaces',  // Left pane active tab
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
    spaces: ['Everything'],  // Array of spaces this collection belongs to
    bookmarks: []           // Array of bookmark objects
}
```

### Space Structure
```javascript
{
    name: "Space Name",      // Name of the space
    deleted: false,          // Soft delete flag
    lastModified: timestamp  // Last modification time
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
- `synchronizeWithGitHub()` - Main sync function with enhanced conflict resolution
- `mergeDatasets()` - Handles data merging between local and remote collections
- `mergeSpaces()` - Handles space data merging with soft-delete support
- `fetchFromGitHub()` / `pushToGitHub()` - API communication via background script

#### Drag & Drop (`bm.js`)
- `dragStartBookmark()` / `dropBookmark()` - Bookmark movement
- `dragStartCollection()` / `dropCollection()` - Collection reordering
- `fetchAllTabs()` - Import Chrome tabs into collections
- Drag collections to different spaces functionality

#### Data Persistence
- `saveToLocalStorage()` / `loadFromLocalStorage()` - Local data management
- `enrichCollection()` / `enrichBookmark()` / `enrichSpace()` - Ensure data structure integrity
- `migrateSpacesToObjectFormat()` - Convert old string spaces to object format

#### Zen Mode (`bm.js`)
- `startZenMode()` / `stopZenMode()` - Toggle zen mode functionality
- `handleZenSearch()` - Search functionality within zen mode
- `handleZenKeyboard()` - Keyboard navigation in zen mode

#### Collection Management (`bm.js`)
- `getSortComparator()` - Returns sorting function based on user preference
- `addBookmark()` - Enhanced dialog for creating bookmarks
- `editBookmark()` - Enhanced dialog for editing bookmarks
- Collection sorting by name (A-Z, Z-A), lastModified, or user-defined position

#### Spaces Management (`bm.js`)
- `initializeSpaces()` - Set up spaces functionality
- `addSpace()` - Add new workspace
- `removeSpace()` - Soft delete spaces with confirmation
- `renderSpacesList()` - Display available spaces

#### Search & Navigation (`bm.js`)
- `applyFilter()` - Global search function with multiple operators
- `handleZenSearch()` - Zen mode search handling
- Google search with `?` prefix
- ChatGPT search with `!` prefix

#### Background Management (`bm.js`)
- `setBackground()` - Set predefined or custom background
- `setCustomBackground()` / `removeCustomBackground()` - Custom image management
- `loadCustomBackgrounds()` / `saveCustomBackgrounds()` - Custom image persistence

## Search Functionality

The extension includes powerful search with special operators:
- `#term` - Search collection names only
- `%term` - Global search (collections + bookmarks)
- `term1|term2` - OR search with pipe separator
- `?query` - Quick Google search (opens in new tab)
- `!query` - Quick ChatGPT search (opens ChatGPT with query)
- Regular search filters bookmarks within collections

### Zen Mode Search
- Dedicated search box in zen mode with smooth animations
- Keyboard navigation with Escape key to return to zen initial screen
- Search results sync with main search functionality

## Extension Permissions

Required Chrome permissions:
- `tabs` - Tab management and reading tab information
- `windows` - Window management for tab grouping
- `tabGroups` - Creating and managing tab groups
- Host permissions for favicon fetching and GitHub API

## Mobile Development Considerations

The extension is fully responsive and mobile-optimized:
- Uses `-webkit-fill-available` for proper mobile viewport handling
- Touch-optimized buttons and interactions
- Icon-only buttons on mobile for space efficiency (+ for "Add Collection")
- Pane toggle system for mobile navigation
- Zen mode automatically disabled on mobile devices
- Media queries handle responsive layout adjustments

## Common Development Tasks

### Adding New Features
1. Identify if feature needs background script communication
2. Update data structure if needed (`bookmarkManagerData`)
3. Add UI components in `bm.html` and corresponding logic in `bm.js`
4. Test drag-and-drop interactions if applicable
5. Ensure GitHub sync compatibility
6. Test mobile responsiveness on different screen sizes
7. Consider zen mode compatibility if applicable

### Debugging Issues
- Check browser console for both extension and new tab page contexts
- Verify `localStorage` data structure using DevTools
- Test with different bookmark/collection configurations
- Check Chrome extension error logs in `chrome://extensions`
- Test on mobile devices or browser developer tools mobile simulation
- Verify zen mode functionality and keyboard shortcuts

### Data Migration
When modifying data structures, ensure backward compatibility in:
- `loadFromLocalStorage()` function
- `enrichCollection()` / `enrichBookmark()` / `enrichSpace()` functions
- `migrateSpacesToObjectFormat()` for spaces migration

### Collection Sorting Implementation
- Update `getSortComparator()` for new sorting methods
- Disable drag-and-drop when sort order is not "userdefined"
- Hide move up/down buttons when not in user-defined mode
- Ensure `collectionSortOrder` syncs properly via GitHub

## Important Notes

- No package.json or build tools - this is a vanilla JavaScript project
- All external communication goes through background service worker
- Soft deletes preserve data for sync conflict resolution (collections, bookmarks, and spaces)
- Search functionality modifies UI state but not underlying data
- GitHub sync requires user's own repository and personal access token
- Zen mode provides distraction-free experience with clock and search
- Collection sorting affects drag-and-drop availability
- Mobile design uses responsive layout with touch optimization
- Custom backgrounds sync across devices via GitHub repository
- Enhanced dialog design provides consistent user experience
- Spaces management allows workspace organization with soft-delete
- Quick search shortcuts: `?` for Google, `!` for ChatGPT

## Recent Major Updates

### Zen Mode Implementation
- Distraction-free browsing with elegant clock display
- Dedicated search functionality with smooth animations
- Keyboard navigation and Escape key handling
- Automatically disabled on mobile for optimal UX

### Spaces Management System
- Organize collections into workspaces (work, personal, etc.)
- Soft-delete functionality with proper sync support
- Drag collections between spaces
- Migration from string format to object format

### Collection Sorting & Management
- Sort by name (A-Z, Z-A), last modified (newest/oldest), or user-defined
- Disable drag-and-drop when not in user-defined mode
- Enhanced bookmark dialogs with validation and loading states

### Mobile Responsive Design
- Complete mobile optimization with touch-friendly interface
- Responsive viewport handling with `-webkit-fill-available`
- Icon-only buttons for space efficiency
- Pane toggle system for mobile navigation

### Enhanced Search Capabilities
- Quick Google search with `?` prefix
- Quick ChatGPT search with `!` prefix
- Improved global search functionality
- Zen mode search integration