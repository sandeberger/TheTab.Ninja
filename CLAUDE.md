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
- Robust favicon error handling with automatic cleanup and fallback systems
- Modern settings UI with card-based design and improved user experience
- Automatic backup system with customizable folder locations and retention policies

## Architecture

### Core Files Structure

- `manifest.json` - Chrome extension manifest (v3, version 1.2)
- `bm.html` / `bm.js` - Main new tab page interface and logic
- `popup.html` / `popup.js` - Extension popup for saving current tab
- `background.js` - Service worker handling GitHub sync, tab management, favicon fetching
- `styles.css` - External CSS file with modern UI styling, dark mode support, and responsive design
- `tabninja_help.html` - Comprehensive user guide and help documentation

### Key Components

#### Data Management
- All data stored in `localStorage` as `bookmarkManagerData` object
- Collections contain bookmarks with soft-delete functionality (deleted flag)
- Spaces management with object format and soft-delete capability
- GitHub sync uses Git API for remote storage without external dependencies
- Enhanced security with robust merge conflict resolution

#### Favicon Error Handling System
- Comprehensive URL validation and cleanup for problematic favicon URLs
- Automatic detection and replacement of faulty Google favicon service URLs
- Global error handling for image loading failures with graceful fallbacks
- Console error suppression for better user experience
- Fallback SVG icons for failed favicon loads
- Background service worker with multiple fallback sources and timeout handling

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

#### Automatic Backup System
- Scheduled daily/weekly backup creation with Chrome alarms API
- Customizable backup retention policies (3-30 days)
- Downloads API-based file creation with data URLs (service worker compatible)
- Subfolder support in Downloads directory for organization
- Manual and automatic backups use unified backup functions
- Automatic cleanup of old backups based on retention settings
- Cross-session backup scheduling with persistent alarms

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

#### Modern Settings UI Architecture
- Card-based design with clean visual hierarchy and sections
- Settings organized into logical groups: Basic Settings, Sync & Backup, Appearance, Data Management, Help & Support
- Danger zone for destructive actions with clear visual warnings
- Enhanced form controls with proper labels and descriptions
- Responsive design that works on all screen sizes
- Hover effects and smooth transitions for better user experience
- External CSS architecture for better maintainability and performance

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
    autoBackup: {            // Automatic backup configuration
        enabled: true,       // Default enabled
        frequency: 'daily',  // daily, weekly, disabled
        keepDays: 7,        // Retention period in days
        lastBackup: null,   // Timestamp of last backup
        customFolderName: null, // Subfolder name in Downloads
        useCustomFolder: false  // Whether to use custom subfolder
    },
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
4. CSS changes are now in external `styles.css` file for better maintainability
5. Test favicon error handling and fallback mechanisms
6. Verify settings UI responsiveness and user experience

### Testing the Extension
- Load as unpacked extension in Chrome Developer mode
- Refresh extension after code changes
- Check console in both extension context and new tab page
- Test favicon error handling by checking for console errors
- Verify settings UI functionality and responsiveness
- Test external CSS loading and styling consistency

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

#### Favicon Error Handling (`bm.js`)
- `getSafeIconUrl()` - Validates and cleans problematic favicon URLs
- `cleanupFaviconUrls()` - Bulk cleanup of favicon URLs in collections
- `forceCleanupAllFaviconUrls()` - Force cleanup of all existing favicon URLs
- Global error handlers for image loading failures and unhandled promise rejections
- Automatic fallback to safe favicon URLs when problematic patterns are detected

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

#### Enhanced Data Management (`bm.js`)
- Advanced import/export functionality for tab collections
- Toby data import support with JSON format compatibility
- Favicon URL cleanup and validation tools
- Data integrity checks and validation
- Backup and restore capabilities with proper error handling

#### Automatic Backup System (`background.js` + `bm.js`)
- `createAutomaticBackup()` - Creates backup files using Downloads API with data URLs
- `createManualBackup()` - Manual backup creation (uses same logic as automatic)
- `cleanupOldBackups()` - Removes old backup files based on retention policy
- `shouldCreateBackup()` - Determines if backup is needed based on frequency
- Chrome alarms API for scheduled backups (daily/weekly)
- Subfolder support in Downloads directory via `customFolderName` parameter
- Backup settings UI with folder selection and retention controls

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
- `downloads` - Creating backup files in Downloads directory
- `alarms` - Scheduling automatic backups
- `storage` - Chrome storage API for backup data sync
- `scripting` - Executing scripts in tabs for backup data retrieval
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
4. Update external `styles.css` for any styling changes
5. Test drag-and-drop interactions if applicable
6. Ensure GitHub sync compatibility
7. Test mobile responsiveness on different screen sizes
8. Consider zen mode compatibility if applicable
9. Test favicon error handling if feature affects bookmarks
10. Verify settings UI integration and user experience
11. Test data import/export functionality if applicable

### Debugging Issues
- Check browser console for both extension and new tab page contexts
- Verify `localStorage` data structure using DevTools
- Test with different bookmark/collection configurations
- Check Chrome extension error logs in `chrome://extensions`
- Test on mobile devices or browser developer tools mobile simulation
- Verify zen mode functionality and keyboard shortcuts
- Test favicon error handling and fallback mechanisms
- Verify external CSS loading and styling consistency
- Check settings UI responsiveness and user experience
- Test data import/export functionality and validation

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
- Favicon error handling system provides robust fallback mechanisms
- External CSS architecture improves maintainability and performance
- Modern settings UI with card-based design and improved user experience
- Comprehensive error handling and console log suppression for cleaner debugging
- Automatic backup system creates daily/weekly backups with customizable retention
- Backup files stored in Downloads directory with optional subfolder organization

## Recent Major Updates

### Automatic Backup System (Latest)
- Scheduled daily/weekly backup creation using Chrome alarms API
- Customizable backup retention policies (3-30 days) with automatic cleanup
- Downloads API-based file creation with data URLs (service worker compatible)
- Subfolder support in Downloads directory for better organization
- Unified backup functions for both manual and automatic operations
- Settings UI with backup location selection and "Open Folder" functionality
- Cross-session backup scheduling with persistent alarms
- Fallback mechanisms for data retrieval from both localStorage and chrome.storage

### Favicon Error Handling System (Latest)
- Comprehensive URL validation and cleanup for problematic favicon URLs
- Automatic detection and replacement of faulty Google favicon service URLs
- Global error handling for image loading failures with graceful fallbacks
- Console error suppression for better user experience and cleaner debugging
- Background service worker with multiple fallback sources and timeout handling
- Fallback SVG icons for failed favicon loads

### Modern Settings UI Architecture (Latest)
- Complete redesign with card-based layout and clean visual hierarchy
- Settings organized into logical sections: Basic Settings, Sync & Backup, Appearance, Data Management, Help & Support
- Danger zone for destructive actions with clear visual warnings
- Enhanced form controls with proper labels and descriptions
- Responsive design that works across all screen sizes
- Hover effects and smooth transitions for improved user experience
- External CSS architecture for better maintainability and performance

### External CSS Architecture (Latest)
- Separation of HTML structure and CSS styling into external files
- Improved maintainability and performance
- Better code organization and development workflow
- Consistent styling across all components

### Enhanced Data Management (Latest)
- Advanced import/export functionality for tab collections
- Improved Toby data import with better compatibility
- Favicon URL cleanup and validation tools
- Enhanced data integrity checks and validation
- Better error handling and user feedback

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