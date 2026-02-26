/**
 * globals.js - Global constants and variables for TheTab.Ninja
 * Must be loaded first before all other modules.
 */

let bookmarkManagerData = {
    collections: [],
    openInNewTab: false,
    chromeWindowStates: {},
    darkMode: true,
    leftPaneOpen: true,
    rightPaneOpen: true,
    closeWhenSaveTab: false,
    activeLeftTab: 'spaces',
    zenMode: false,
    zenConfig: {
        clockFormat: '24h',        // '12h' | '24h'
        showSeconds: false,
        clockStyle: 'digital',     // 'digital' | 'analog'
        clockFont: 'system',       // 'system' | 'mono' | 'serif' | 'handwritten'
        greetingEnabled: true,
        greetingLocale: 'auto',    // 'auto' | 'sv' | 'en' | 'de' | 'fr' | 'es' | 'no' | 'da' | 'fi'
        ambientAnimation: 'none',  // 'none' | 'gradient' | 'particles'
    },
    spaces: ['Everything'], // Default space that cannot be removed
    currentSpace: 'Everything',
    collectionSortOrder: 'userdefined', // New setting for collection sorting
    hideCoffeeButton: false, // Hide the "Buy Me a Coffee" button
    autoShowLeftPane: false, // Auto-show left pane on hover
    autoShowRightPane: false, // Auto-show right pane on hover
    autoBackup: {
        enabled: false, // Default disabled
        frequency: 'disabled', // daily, weekly, disabled
        keepDays: 7, // Keep backups for 7 days
        lastBackup: null, // Timestamp of last backup
        customFolder: null, // File system directory handle
        folderPath: 'Downloads', // Display path for user
        useCustomFolder: false // Whether to use custom folder
    },
    autoSync: {
        enabled: false,
        delaySeconds: 30
    },
    syncProvider: 'none', // 'none', 'github', 'googledrive', 'localdrive'
    githubConfig: {
        username: '',
        repo: '',
        pat: '',
        filepath: 'bookmarks.json'
    },
    googleDriveConfig: {
        connected: false,
        fileId: null,        // Google Drive file ID for bookmarks.json
        userEmail: '',       // Connected Google account email
        fileName: 'tabninja-bookmarks.json'
    },
    localDriveConfig: {
        connected: false,
        folderName: '',      // Display name of selected folder
        fileName: 'tabninja-bookmarks.json'
    }
};

let draggedItem = null;
let placeholder = null;

// Fallback icon paths (extracted from inline base64 SVGs)
const FALLBACK_ICON = 'assets/icons/fallback-icon.svg';
const FALLBACK_ICON_LIGHT = 'assets/icons/fallback-icon-light.svg';
const FALLBACK_ICON_DARK = 'assets/icons/fallback-icon-dark.svg';

// Sync state tracking
let isSyncing = false;

// Auto-sync debounce timer
let autoSyncTimer = null;

// SVG icons for collection buttons
const svgInbox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309.197 309.197" xml:space="preserve" style="width:1em;height:1em" fill="currentColor"><path d="M120.808 10.036h67.581v100.671h54.559l-88.351 100.88-88.351-100.882h54.562z"/><path d="M260.002 176.673v73.289H49.195v-73.289H0v122.488h309.197V176.673z"/></svg>`;
const svgOutbox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309.197 309.197" xml:space="preserve" style="width:1em;height:1em" fill="currentColor"><path d="M120.808 211.587h67.581V110.916h54.559l-88.351-100.88-88.351 100.882h54.562z"/><path d="M260.002 176.673v73.289H49.195v-73.289H0v122.488h309.197V176.673z"/></svg>`;

// Confetti timeout reference
let confettiTimeout;

// Zen mode variables
let zenDateTimeInterval = null;
let zenScrollListener = null;
let zenSearchListener = null;
let zenKeyboardListener = null;
let zenClickListener = null;
let zenUserHasScrolled = false;

// Zen search box listener references (for proper cleanup)
let zenSearchBoxInputListener = null;
let zenSearchBoxKeydownListener = null;

// Zen ambient animation frame reference
let zenAmbientAnimationFrame = null;

// Zen ambient particle resize listener (for cleanup)
let zenParticleResizeListener = null;

// Zen focus input listener references (for proper cleanup)
let zenFocusKeydownListener = null;
let zenFocusBlurListener = null;
let zenFocusClickListener = null;
let zenFocusClearClickListener = null;
