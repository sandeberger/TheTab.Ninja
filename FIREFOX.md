# TheTab.Ninja for Firefox

TheTab.Ninja now runs on Firefox. The Chrome and Firefox versions share the same
source code — only the manifest differs. This document explains how the port
works, how to build and test it, what behaves differently on Firefox, and which
Firefox-specific improvements exist or are planned.

## Quick start

```bash
./build.sh firefox        # builds dist/firefox + dist/thetab-ninja-firefox-v<version>.zip
```

Then either:

- **Temporary install:** open `about:debugging#/runtime/this-firefox` →
  *Load Temporary Add-on…* → select `dist/firefox/manifest.json`, or
- **web-ext:** `npx web-ext run --source-dir dist/firefox` (launches a clean
  Firefox profile with the extension loaded), or
- **Lint before submitting to AMO:** `npx web-ext lint --source-dir dist/firefox`

For a permanent install the extension must be signed by Mozilla — submit the
zip to [addons.mozilla.org](https://addons.mozilla.org/developers/) (listed or
unlisted/self-distributed).

## How the port works

The codebase uses the callback-based `chrome.*` WebExtension namespace, which
Firefox supports natively, so almost everything runs unchanged. The differences
are isolated to the manifest and a few feature-detected code paths:

### Manifest (`manifest.firefox.json`)

| Area | Chrome (`manifest.json`) | Firefox (`manifest.firefox.json`) |
|---|---|---|
| Background | `background.service_worker` | `background.scripts` (MV3 event page — Firefox does not support extension service workers) |
| Identity | `browser_specific_settings` not needed | `browser_specific_settings.gecko` with add-on `id`, `strict_min_version: 128.0` and `data_collection_permissions` (required by AMO for new submissions) |
| Name | Long store-optimized name | Max 45 characters (AMO requirement) |
| Sidebar | — | `sidebar_action` shows TheTab.Ninja in the Firefox sidebar |
| OAuth | `oauth2.client_id` (Chrome app client) | `oauth2.client_id` empty by default — see Google Drive below |

`chrome_url_overrides.newtab`, the action popup with `theme_icons`
(a Firefox-originated feature!), CSP and host permissions are identical.

### Feature-detected code paths (shared source)

- **Tab groups** (`background.js`): Firefox supports tab groups from version
  139. The code detects `chrome.tabs.group`/`chrome.tabGroups` at startup; on
  older Firefox versions "Launch collection" opens the tabs ungrouped and the
  open-tabs pane simply shows no group headers. Everything else keeps working.
- **Automatic backups** (`background.js`): Chrome's MV3 service worker lacks
  `URL.createObjectURL`, so it uses `data:` URLs with the downloads API.
  Firefox's event page has full DOM APIs, and its downloads API handles blob
  URLs more reliably than large data URLs — so the code uses a `Blob` +
  `URL.createObjectURL` when available.
- **Google Drive sign-in** (`js/sync.js`): Firefox does not implement
  `chrome.identity.getAuthToken`. The code falls back to
  `chrome.identity.launchWebAuthFlow` with the OAuth *implicit grant* flow and
  caches the access token (with expiry) in `localStorage`.
- **Host permissions** (`js/sync.js`): Firefox MV3 treats `host_permissions`
  as *opt-in* rather than granting them at install time like Chrome. The
  extension checks and requests the needed origins (`chrome.permissions`)
  when you press Sync or connect Google Drive. You can also grant them
  manually under *about:addons → TheTab.Ninja → Permissions*.
- **Internal URLs** (`js/utils.js`): tab-import filters now recognize
  `about:` and `moz-extension://` pages in addition to `chrome://`, so
  Firefox-internal pages are never imported into collections.

## What works on Firefox

- New tab override with the full bookmark manager, spaces, zen mode, search
  operators, dark mode, custom backgrounds, drag & drop
- Open-tabs pane, importing tabs/windows into collections, switching to tabs
- Tab groups (Firefox 139+): group colors/titles, launch collection as group
- GitHub sync — works out of the box, exactly as on Chrome
- Local Drive sync and manual import/export
- Automatic scheduled backups (alarms + downloads, including custom subfolder
  and retention cleanup)
- Toolbar popup ("save current tab to collection")
- **Sidebar (Firefox-only bonus):** open TheTab.Ninja in the sidebar
  (View → Sidebar, or the sidebar switcher) and keep your collections visible
  next to the page you are browsing. The mobile-responsive layout adapts to
  the narrow panel automatically.

## Known differences and limitations

1. **Google Drive sync requires a one-time developer setup.** The Chrome
   build uses a Chrome-specific OAuth client which Google refuses for other
   browsers. To enable Drive sync on Firefox:
   1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
      create an OAuth client of type **Web application**.
   2. Add the extension's redirect URI as an authorized redirect URI. You get
      it from `chrome.identity.getRedirectURL()` in the extension console —
      it looks like `https://<hash>.extensions.allizom.org/`. (Stable add-on
      `id` in the manifest keeps this URL stable.)
   3. Put the client id in `manifest.firefox.json` → `oauth2.client_id` and
      rebuild.
   Until then, the UI shows a friendly error pointing to GitHub sync, which
   needs no setup.
2. **Tab groups need Firefox 139+.** On older versions collections launch as
   ungrouped tabs (`strict_min_version` is kept at 128 ESR on purpose).
3. **First new tab confirmation.** Firefox asks the user to confirm keeping
   the new-tab override the first time — this is standard Firefox behavior
   for all new-tab extensions.
4. **Address bar keeps focus on new tab.** Firefox focuses the URL bar on
   new tabs and (unlike Chrome) does not let the page steal focus; press Tab
   or click to focus TheTab.Ninja's search field.
5. **Backup files and `downloads.removeFile`.** Retention cleanup works, but
   Firefox may keep download history entries visible until `erase` completes;
   harmless either way.

## Firefox-specific improvement ideas (roadmap)

Implemented in this port:

- ✅ **Sidebar mode** via `sidebar_action` — browse collections alongside any page.
- ✅ Graceful degradation of tab groups pre-139.
- ✅ Opt-in host-permission flow for MV3.

Good candidates for future Firefox-only enhancements:

- **Container tabs (`contextualIdentities`):** open a collection — or a whole
  Space — in its own Firefox container (separate cookies/sessions). A natural
  fit: "Work" space opens in the Work container. Chrome has no equivalent.
- **`storage.sync` via Firefox Sync:** offer Mozilla-account sync as a third,
  zero-setup provider next to GitHub/Google Drive (quota ~100 KB, so best for
  settings or as a pointer/merge journal rather than full data).
- **Keyboard commands (`commands` API):** global shortcuts for "open zen
  mode", "save current tab", "toggle sidebar" (`_execute_sidebar_action`).
- **Theme integration (`theme` API):** derive accent colors from the active
  Firefox theme, or ship a matching companion theme.
- **`search` API:** let the quick-search prefixes (`?`, `!`) target the
  user's installed Firefox search engines instead of hard-coded URLs.
- **Firefox for Android:** AMO now accepts MV3 extensions for Android; the
  mobile-responsive layout is already in place. Would require testing the
  new-tab override story on mobile (not supported there — the sidebar/popup
  entry points would carry the experience).
- **Tab hiding (`tabs.hide`):** a "focus mode" that temporarily hides all
  tabs outside the current collection/space instead of closing them.
- **Native bookmarks bridge (`bookmarks` API):** two-way import/export with
  Firefox's built-in bookmarks (Chrome exposes this too, but Firefox's
  unlimited bookmark tags map nicely onto Spaces).

## Repository layout

```
manifest.json            Chrome manifest (MV3 service worker)
manifest.firefox.json    Firefox manifest (MV3 event page)
build.sh                 builds dist/chrome and dist/firefox + zips
background.js, js/, ...  shared source used by both builds
```
