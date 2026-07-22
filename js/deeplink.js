/**
 * deeplink.js - URL deep links, solo view and desktop-shortcut launcher files
 *
 * URL scheme (on bm.html):
 *   ?collection=<id>[&name=<name>]  solo view of one collection (name = fallback lookup)
 *   ?collection=<id>&launch=1       launch all bookmarks immediately
 *   ?bookmark=<id>                  redirect to that bookmark's URL
 *   ?space=<name>                   show only collections in that space (ephemeral)
 *   ?tag=<name>                     show only bookmarks carrying that tag (ephemeral)
 *   ?q=<term>                       prefill the search filter (supports #, %, | operators)
 *
 * link.html is the web-accessible entry point used by launcher files; it forwards
 * whitelisted params here. Solo state lives in globals.js and is never persisted.
 */

// Parse params and set the solo body class before first paint (scripts run at end
// of <body>, before rendering), so the full UI never flashes in solo mode.
(function parseDeepLinkParams() {
    if (!window.location.search) return;
    let params;
    try {
        params = new URLSearchParams(window.location.search);
    } catch (e) {
        return;
    }

    soloCollectionId = params.get('collection') || null;
    soloCollectionName = params.get('name') || null;
    soloBookmarkId = params.get('bookmark') || null;
    soloSpace = params.get('space') || null;
    soloTag = params.get('tag') || null;
    soloQuery = params.get('q') || null;
    soloLaunch = params.get('launch') === '1';

    if (soloCollectionId || soloCollectionName || soloBookmarkId) {
        document.body.classList.add('solo-mode');
    } else if (soloSpace || soloTag) {
        document.body.classList.add('solo-space-mode');
    }
})();

// True when any deep-link parameter is active
function hasDeepLink() {
    return !!(soloCollectionId || soloCollectionName || soloBookmarkId || soloSpace || soloTag || soloQuery);
}

// Resolve solo params against loaded data. Called from init.js after
// loadFromLocalStorage() but before renderCollections().
function resolveSoloCollection() {
    // Bookmark redirect takes priority - leave the page immediately
    if (soloBookmarkId) {
        for (const collection of bookmarkManagerData.collections) {
            if (collection.deleted) continue;
            const bookmark = (collection.bookmarks || []).find(b => b.id === soloBookmarkId && !b.deleted);
            if (bookmark && typeof isSafeUrl === 'function' && isSafeUrl(bookmark.url)) {
                window.location.replace(bookmark.url);
                return;
            }
        }
        soloNotFound = true;
        return;
    }

    if (!soloCollectionId && !soloCollectionName) return;

    const collections = bookmarkManagerData.collections.filter(c => !c.deleted);
    let match = soloCollectionId ? collections.find(c => c.id === soloCollectionId) : null;
    if (!match && soloCollectionName) {
        const wanted = soloCollectionName.toLowerCase();
        match = collections.find(c => (c.name || '').toLowerCase() === wanted);
    }

    if (match) {
        soloCollectionId = match.id;
    } else {
        soloNotFound = true;
    }
}

// ============================================================
// Tags (forward-compatible: bookmark.tags may not exist yet)
// ============================================================

// Normalize a bookmark's tags to a lowercase string array.
// Accepts array or comma/space separated string; absent field -> [].
function getBookmarkTags(bookmark) {
    const raw = bookmark && bookmark.tags;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(t => String(t).trim().toLowerCase()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw.split(/[\s,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

function bookmarkHasTag(bookmark, tag) {
    return getBookmarkTags(bookmark).includes(String(tag).trim().toLowerCase());
}

// Hide bookmarks not carrying soloTag (post-render DOM pass, same mechanism as
// applyFilter). Collections left without visible bookmarks are hidden too.
function applySoloTagFilter() {
    if (!soloTag) return;
    let anyVisible = false;
    document.querySelectorAll('.collection').forEach(collectionElement => {
        const collectionData = bookmarkManagerData.collections.find(c => c.id === collectionElement.dataset.collectionId);
        if (!collectionData) return;
        let hasVisible = false;
        collectionElement.querySelectorAll('.bookmark').forEach(bookmarkElement => {
            const bookmarkData = (collectionData.bookmarks || []).find(b => b.id === bookmarkElement.dataset.bookmarkId);
            const show = !!bookmarkData && bookmarkHasTag(bookmarkData, soloTag);
            bookmarkElement.classList.toggle('hidden', !show);
            if (show) hasVisible = true;
        });
        if (hasVisible && !collectionElement.classList.contains('is-open')) {
            collectionElement.classList.add('is-open');
            const container = collectionElement.querySelector('.bookmarks');
            if (container) container.style.display = 'flex';
        }
        collectionElement.classList.toggle('hidden', !hasVisible);
        if (hasVisible) anyVisible = true;
    });
    if (!anyVisible) {
        renderSoloNotFound(`No bookmarks with the tag "${soloTag}" were found.`);
    }
}

// ============================================================
// Deep-link URL + launcher file generation
// ============================================================

function buildDeepLinkUrl(params) {
    const search = new URLSearchParams();
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            search.set(key, params[key]);
        }
    });
    return chrome.runtime.getURL('link.html') + '?' + search.toString();
}

function buildCollectionDeepLink(collection) {
    return buildDeepLinkUrl({ collection: collection.id, name: collection.name });
}

// Sanitize a name for use as a filename (also strips ':' which would break the
// DownloadURL drag format "type:filename:url").
function buildLauncherFilename(name) {
    const safe = String(name || 'Collection').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 60);
    return `TabNinja - ${safe || 'Collection'}.html`;
}

// Escape for embedding inside a JSON <script> block: < also covers </script>
function jsonForEmbedding(payload) {
    return JSON.stringify(payload, null, 2).replace(/</g, '\\u003c');
}

function launcherBookmarkEntry(bookmark) {
    const entry = {
        id: bookmark.id,
        title: bookmark.title || bookmark.url,
        url: bookmark.url,
        description: bookmark.description || '',
        position: bookmark.position || 0
    };
    const tags = getBookmarkTags(bookmark);
    if (tags.length) entry.tags = tags;
    if (bookmark.icon && /^https?:\/\//.test(bookmark.icon)) entry.icon = bookmark.icon;
    return entry;
}

// Shared skeleton for launcher files. groups: [{name, bookmarks: [...]}]
// The file is self-contained: link list works everywhere; a hidden probe image
// detects whether the creating extension is installed and only then redirects.
function buildLauncherDocument({ title, subtitle, deepLink, groups, payload }) {
    const esc = escapeHtml;
    const totalCount = groups.reduce((n, g) => n + g.bookmarks.length, 0);
    const probeUrl = chrome.runtime.getURL('assets/light-128.png');

    const groupsHtml = groups.map(group => {
        const items = group.bookmarks.map(b => {
            const desc = b.description ? `<span class="desc">${esc(b.description)}</span>` : '';
            return `<li><a href="${esc(b.url)}" title="${esc(b.url)}">${esc(b.title || b.url)}</a>${desc}</li>`;
        }).join('\n');
        const heading = groups.length > 1 ? `<h2>${esc(group.name)}</h2>` : '';
        return `${heading}\n<ul class="links">\n${items}\n</ul>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} – TheTab.Ninja</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         margin: 0; padding: 24px; background: #f4f6fb; color: #1c2733; }
  .card { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 12px;
          padding: 28px 32px; box-shadow: 0 2px 12px rgba(20,40,80,.08); }
  h1 { margin: 0 0 4px; font-size: 22px; }
  h2 { font-size: 15px; margin: 20px 0 6px; color: #456bf6; }
  .meta { color: #667; font-size: 13px; margin-bottom: 14px; }
  .open-btn { display: inline-block; background: #456bf6; color: #fff; text-decoration: none;
              padding: 8px 16px; border-radius: 8px; font-size: 14px; margin: 6px 0 14px; }
  .no-ext-note { display: none; background: #fff6e0; border: 1px solid #eeddaa;
                 border-radius: 8px; padding: 10px 14px; font-size: 13px; }
  body.no-ext .no-ext-note { display: block; }
  body.no-ext .open-btn { display: none; }
  ul.links { list-style: none; padding: 0; margin: 8px 0; }
  ul.links li { padding: 7px 0; border-bottom: 1px solid #eef1f6; }
  ul.links a { color: #1c56d6; text-decoration: none; font-size: 15px; }
  ul.links a:hover { text-decoration: underline; }
  .desc { display: block; color: #778; font-size: 12px; margin-top: 2px; }
  .foot { margin-top: 18px; font-size: 11px; color: #99a; }
  @media (prefers-color-scheme: dark) {
    body { background: #14181f; color: #dde3ec; }
    .card { background: #1d232d; box-shadow: none; }
    ul.links li { border-color: #2a3341; }
    ul.links a { color: #7ea2ff; }
    .no-ext-note { background: #2a2618; border-color: #4a4020; }
  }
</style>
<script>
  function tabninjaOpen() { location.replace(${JSON.stringify(deepLink)}); }
  function tabninjaNoExt() { document.body.classList.add('no-ext'); }
</script>
</head>
<body>
<div class="card">
  <h1>${esc(title)}</h1>
  <div class="meta">${esc(subtitle)} · ${totalCount} bookmark${totalCount === 1 ? '' : 's'}</div>
  <a class="open-btn" href="${esc(deepLink)}">Open in TheTab.Ninja</a>
  <div class="no-ext-note">TheTab.Ninja isn't installed in this browser — the links below still work.</div>
${groupsHtml}
  <div class="foot">Created with TheTab.Ninja · machine-readable data embedded below for other tools.</div>
</div>
<img src="${esc(probeUrl)}" alt="" style="display:none" onload="tabninjaOpen()" onerror="tabninjaNoExt()">
<script type="application/json" id="tabninja-data">
${jsonForEmbedding(payload)}
</script>
</body>
</html>`;
}

// Launcher for one collection ("thetab.ninja/collection" schema)
function buildCollectionLauncherHTML(collection) {
    const bookmarks = (collection.bookmarks || []).filter(b => !b.deleted && isSafeUrl(b.url));
    const deepLink = buildCollectionDeepLink(collection);
    const manifest = chrome.runtime.getManifest();

    return buildLauncherDocument({
        title: collection.name,
        subtitle: 'TheTab.Ninja collection',
        deepLink: deepLink,
        groups: [{ name: collection.name, bookmarks: bookmarks.map(launcherBookmarkEntry) }],
        payload: {
            schema: 'thetab.ninja/collection',
            schemaVersion: 1,
            generator: `TheTab.Ninja/${manifest.version}`,
            exportedAt: new Date().toISOString(),
            extensionUrl: deepLink,
            collection: {
                id: collection.id,
                name: collection.name,
                spaces: collection.spaces || ['Everything'],
                bookmarks: bookmarks.map(launcherBookmarkEntry)
            }
        }
    });
}

// Launcher for a search selection ("thetab.ninja/selection" schema).
// groups: [{id, name, bookmarks: [...raw bookmark objects]}]
function buildSelectionLauncherHTML(groups, query) {
    const deepLink = buildDeepLinkUrl({ q: query });
    const manifest = chrome.runtime.getManifest();
    const cleanGroups = groups.map(g => ({
        id: g.id,
        name: g.name,
        bookmarks: g.bookmarks.filter(b => !b.deleted && isSafeUrl(b.url)).map(launcherBookmarkEntry)
    })).filter(g => g.bookmarks.length > 0);

    return buildLauncherDocument({
        title: `Search: ${query}`,
        subtitle: 'TheTab.Ninja search selection',
        deepLink: deepLink,
        groups: cleanGroups,
        payload: {
            schema: 'thetab.ninja/selection',
            schemaVersion: 1,
            generator: `TheTab.Ninja/${manifest.version}`,
            exportedAt: new Date().toISOString(),
            extensionUrl: deepLink,
            query: query,
            collections: cleanGroups
        }
    });
}

// data: URL for the DownloadURL drag type (base64 to survive any characters)
function htmlToDataUrl(html) {
    const bytes = new TextEncoder().encode(html);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return 'data:text/html;charset=utf-8;base64,' + btoa(binary);
}

// Download a launcher file (works in every browser - the Firefox path)
function downloadLauncherFile(html, filename) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportCollectionLauncher(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    downloadLauncherFile(buildCollectionLauncherHTML(collection), buildLauncherFilename(collection.name));
}

function copyCollectionLink(collectionId) {
    const collection = bookmarkManagerData.collections.find(c => c.id === collectionId);
    if (!collection) return;
    navigator.clipboard.writeText(buildCollectionDeepLink(collection)).catch(err => {
        console.error('Could not copy link:', err);
    });
}

// ============================================================
// Search selection (used by the search export chip)
// ============================================================

// Collect currently visible bookmarks from the filtered DOM,
// grouped per source collection.
function collectVisibleSelection() {
    const groups = [];
    document.querySelectorAll('.collection:not(.hidden)').forEach(collectionElement => {
        const collectionData = bookmarkManagerData.collections.find(c => c.id === collectionElement.dataset.collectionId);
        if (!collectionData) return;
        const bookmarks = [];
        collectionElement.querySelectorAll('.bookmark:not(.hidden)').forEach(bookmarkElement => {
            const bookmarkData = (collectionData.bookmarks || []).find(b => b.id === bookmarkElement.dataset.bookmarkId);
            if (bookmarkData && !bookmarkData.deleted) bookmarks.push(bookmarkData);
        });
        if (bookmarks.length) {
            groups.push({ id: collectionData.id, name: collectionData.name, bookmarks });
        }
    });
    return groups;
}

function exportSelectionLauncher() {
    const searchBox = document.getElementById('searchBox');
    const query = searchBox ? searchBox.value.trim() : '';
    if (!query) return;
    const groups = collectVisibleSelection();
    if (!groups.length) return;
    const safeName = query.replace(/[\\/:*?"<>|#%]/g, '_').slice(0, 40);
    downloadLauncherFile(buildSelectionLauncherHTML(groups, query), `TabNinja search - ${safeName}.html`);
}

// Update the chip next to the search box: visible with a hit count whenever a
// filter is active. Called after applyFilter runs.
function updateSearchExportChip() {
    const chip = document.getElementById('searchExportChip');
    const countEl = document.getElementById('searchExportCount');
    const searchBox = document.getElementById('searchBox');
    if (!chip || !countEl || !searchBox) return;

    const term = searchBox.value.trim();
    // ? and ! are Google/ChatGPT shortcuts, not filters - nothing to export
    if (!term || term.startsWith('?') || term.startsWith('!')) {
        chip.style.display = 'none';
        return;
    }

    const groups = collectVisibleSelection();
    const count = groups.reduce((n, g) => n + g.bookmarks.length, 0);
    if (count === 0) {
        chip.style.display = 'none';
        return;
    }
    countEl.textContent = String(count);
    chip.style.display = 'flex';
}

// Wire up drag + download on the search export chip (called once from init.js)
function initSearchExportChip() {
    const chip = document.getElementById('searchExportChip');
    if (!chip) return;

    chip.addEventListener('dragstart', (e) => {
        const searchBox = document.getElementById('searchBox');
        const query = searchBox ? searchBox.value.trim() : '';
        const groups = collectVisibleSelection();
        if (!query || !groups.length) {
            e.preventDefault();
            return;
        }
        try {
            const html = buildSelectionLauncherHTML(groups, query);
            const safeName = query.replace(/[\\/:*?"<>|#%]/g, '_').slice(0, 40);
            const filename = `TabNinja search - ${safeName}.html`;
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('DownloadURL', `text/html:${filename}:${htmlToDataUrl(html)}`);
            e.dataTransfer.setData('text/uri-list', buildDeepLinkUrl({ q: query }));
            e.dataTransfer.setData('text/plain', buildDeepLinkUrl({ q: query }));
        } catch (err) {
            console.warn('Could not start search export drag:', err);
        }
    });

    const downloadBtn = document.getElementById('searchExportDownload');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportSelectionLauncher();
        });
    }
}

// ============================================================
// Solo view UI helpers (used by ui-render.js / init.js)
// ============================================================

// Insert the solo header (collection name + actions) above the collections list
function renderSoloHeader(collection) {
    removeSoloBanner();
    const container = document.getElementById('collections');
    if (!container) return;

    const header = document.createElement('div');
    header.className = 'solo-header';
    header.id = 'soloBanner';

    const title = document.createElement('h1');
    title.textContent = collection.name;

    const actions = document.createElement('div');
    actions.className = 'solo-header-actions';

    const openAllBtn = document.createElement('button');
    openAllBtn.className = 'solo-open-all';
    openAllBtn.textContent = 'Open all';
    openAllBtn.addEventListener('click', () => launchCollection(collection.id));

    const fullLink = document.createElement('a');
    fullLink.className = 'solo-full-link';
    fullLink.href = 'bm.html';
    fullLink.textContent = 'Open full TheTab.Ninja';

    actions.appendChild(openAllBtn);
    actions.appendChild(fullLink);
    header.appendChild(title);
    header.appendChild(actions);
    container.parentNode.insertBefore(header, container);
}

// Friendly panel when the requested collection/bookmark/tag has no match
function renderSoloNotFound(message) {
    removeSoloBanner();
    const container = document.getElementById('collections');
    if (!container) return;

    const panel = document.createElement('div');
    panel.className = 'solo-not-found';
    panel.id = 'soloBanner';

    const text = document.createElement('p');
    text.textContent = message || 'This link points to a collection that does not exist in this browser.';

    const fullLink = document.createElement('a');
    fullLink.href = 'bm.html';
    fullLink.textContent = 'Open full TheTab.Ninja';

    panel.appendChild(text);
    panel.appendChild(fullLink);
    container.parentNode.insertBefore(panel, container);
}

function removeSoloBanner() {
    const existing = document.getElementById('soloBanner');
    if (existing) existing.remove();
}

// Called from init.js after the first renderCollections()
function applyDeepLinkAfterRender() {
    if (soloNotFound) {
        renderSoloNotFound();
        return;
    }

    if (soloCollectionId && document.body.classList.contains('solo-mode')) {
        const collection = bookmarkManagerData.collections.find(c => c.id === soloCollectionId && !c.deleted);
        if (collection) {
            renderSoloHeader(collection);
            if (soloLaunch) {
                soloLaunch = false; // fire once per page load
                launchCollection(collection.id);
            }
        } else {
            renderSoloNotFound();
        }
        return;
    }

    if (soloTag) {
        applySoloTagFilter();
    }

    if (soloQuery) {
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            searchBox.value = soloQuery;
            applyFilter(soloQuery);
            if (typeof updateSearchExportChip === 'function') updateSearchExportChip();
        }
    }
}