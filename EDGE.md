# TheTab.Ninja for Microsoft Edge

Edge is Chromium-based, so TheTab.Ninja runs on it with the same source code as
the Chrome and Firefox versions — only the manifest differs. This document
covers how to build and test the Edge package, the few real differences from
Chrome, and Edge-specific extras.

## Quick start

```bash
./build.sh edge          # builds dist/edge + dist/thetab-ninja-edge-v<version>.zip
```

Then open `edge://extensions`, enable **Developer mode**, click
**Load unpacked** and select `dist/edge`.

For distribution, submit the zip to
[Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/)
(Edge Add-ons store). Review times are typically a few days and there is no
developer fee.

## How the Edge version differs from Chrome

Edge shares Chrome's MV3 extension platform (service worker background,
`chrome.*` APIs, tab groups, downloads, alarms), so nearly everything is
identical. The differences handled by this port:

1. **Google sign-in (`identity.getAuthToken`).** Edge exposes the function but
   it always fails, because Edge has no Google account integration. The code
   detects Edge (`Edg/` in the user agent) and uses the same
   `identity.launchWebAuthFlow` implicit-grant flow as Firefox instead
   (`js/sync.js`). See *Google Drive setup* below.
2. **New tab URL.** Edge uses `edge://newtab/` instead of `chrome://newtab/`;
   the background redirect listener recognizes both. (The
   `chrome_url_overrides.newtab` override itself works the same.)
3. **Sidebar (Edge extra).** `manifest.edge.json` declares `side_panel` +
   the `sidePanel` permission, so TheTab.Ninja can be opened in Edge's sidebar
   and stay visible next to the page you are browsing — same idea as the
   Firefox `sidebar_action`. Open it from the extension icon's context menu
   ("Open in side panel") or Edge's sidebar UI. The mobile-responsive layout
   adapts to the narrow panel automatically.
4. **Store name length.** The Edge Add-ons store requires a name of at most
   45 characters, so the Edge manifest uses the short name.
5. **Internal pages.** Tab-import filters already skip `edge://` pages
   (`isBrowserInternalUrl` in `js/utils.js`).

Host permissions behave like Chrome (granted at install), so the opt-in
permission flow added for Firefox is a no-op on Edge.

## Google Drive setup (one-time, optional)

Like on Firefox, Drive sync needs a **Web application** OAuth client because
Google's Chrome-extension client type only works in Chrome:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth client of type **Web application**.
2. Add the extension's redirect URI as an authorized redirect URI. Get it from
   `chrome.identity.getRedirectURL()` in the extension console — on Edge it
   looks like `https://<extension-id>.chromiumapp.org/`. Note that the
   extension id (and therefore the redirect URI) changes between an unpacked
   dev install and the store-signed build, so register both.
3. Put the client id in `manifest.edge.json` → `oauth2.client_id` and rebuild.

Until then the UI shows a friendly error pointing to GitHub sync, which works
out of the box on Edge.

## What works on Edge

Everything in the Chrome version:

- New tab override, collections, spaces, zen mode, search operators,
  dark mode, custom backgrounds, drag & drop
- Open-tabs pane and tab groups (colors, titles, launch collection as group)
- GitHub sync, Local Drive sync, import/export, Toby import
- Automatic scheduled backups with retention cleanup
- Toolbar popup ("save current tab to collection")

Plus the Edge sidebar mode described above.

## Edge-specific improvement ideas (roadmap)

- **Collections import:** Edge has a built-in "Collections" feature; an
  importer (via copy-paste export or the clipboard format) would mirror the
  existing Toby import.
- **Vertical tabs affinity:** Edge users often run vertical tabs; a compact
  density option for the open-tabs pane would pair well with it.
- **Workspaces awareness:** Edge Workspaces overlap conceptually with
  TheTab.Ninja Spaces — naming/import conventions could bridge them.
- **Sidebar auto-open:** use `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
  as an optional setting for users who prefer the sidebar over the popup.

## Repository layout

```
manifest.json            Chrome manifest (MV3 service worker)
manifest.firefox.json    Firefox manifest (MV3 event page)
manifest.edge.json       Edge manifest (MV3 service worker + side_panel)
build.sh                 builds dist/chrome, dist/firefox and dist/edge + zips
background.js, js/, ...  shared source used by all builds
```
