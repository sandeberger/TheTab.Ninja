/**
 * globals.js - Global constants and variables for TheTab.Ninja
 * Must be loaded first before all other modules.
 */

//const extId = 'ekincidnpifabcbbchcapcahaoeoccgp' //test
const extId = 'bnmjmbmlfohkaghofdaadenippkgpmab'; //1.08
//https://wallpapersden.com/

let bookmarkManagerData = {
    collections: [],
    openInNewTab: false,
    chromeWindowStates: {},
    darkMode: false,
    leftPaneOpen: true,
    rightPaneOpen: true,
    closeWhenSaveTab: false,
    activeLeftTab: 'spaces',
    zenMode: false,
    spaces: ['Everything'], // Default space that cannot be removed
    currentSpace: 'Everything',
    collectionSortOrder: 'userdefined', // New setting for collection sorting
    autoBackup: {
        enabled: true, // Default enabled
        frequency: 'daily', // daily, weekly, disabled
        keepDays: 7, // Keep backups for 7 days
        lastBackup: null, // Timestamp of last backup
        customFolder: null, // File system directory handle
        folderPath: 'Downloads', // Display path for user
        useCustomFolder: false // Whether to use custom folder
    },
    githubConfig: {
        username: '',
        repo: '',
        pat: '',
        filepath: 'bookmarks.json'
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
