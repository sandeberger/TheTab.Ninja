# Deep links & desktop shortcuts

TheTab.Ninja can be opened with URL parameters that select what to show, and
collections or search results can be dragged to the desktop as self-contained
launcher files. Together these form a bridge between TheTab.Ninja and other
tools (fileninja, launchdeck, crosswire, ...): a launcher file both opens the
right view in the extension **and** carries machine-readable JSON that other
tools can parse.

## URL scheme

All parameters work on `bm.html`. External callers (launcher files, other
apps, web pages) must go through `link.html` — the only web-accessible page —
which forwards whitelisted parameters to `bm.html`:

```
chrome-extension://<id>/link.html?collection=<uuid>&name=<name>
```

| Parameter | Effect |
|---|---|
| `collection=<uuid>` | Solo view: show only this collection (launch-focused, no editing). Looked up by id among non-deleted collections. |
| `name=<name>` | Fallback for `collection`: if the id has no match, a case-insensitive name match is used. Keeps links working after a re-import changes ids. |
| `collection=<uuid>&launch=1` | Open all the collection's bookmarks immediately (as a tab group where supported). Fires once per page load. |
| `bookmark=<uuid>` | Redirect straight to that bookmark's URL. |
| `space=<name>` | Show only collections belonging to that space. Ephemeral — the saved `currentSpace` is untouched. |
| `tag=<name>` | Show only bookmarks carrying that tag (see Tags below). |
| `q=<term>` | Prefill the search filter. Supports the normal operators (`#name`, `%global`, `a|b`). |

Unknown/missing targets show a friendly panel with a link to the full view —
never a blank page. Opening `bm.html` without parameters (new tab, sidebar,
side panel) behaves exactly as before.

**Tags:** the `tag` parameter matches a `tags` field on bookmarks (array or
comma/space-separated string, case-insensitive). Builds without the tags
feature simply show the not-found panel.

## Desktop shortcuts (launcher files)

Three ways to create one:

- **Drag a collection's handle to the desktop** (Chrome/Edge — requires the
  user-defined sort order, where the handle is draggable).
- **Collection menu → "Save desktop shortcut"** (all browsers, incl. Firefox,
  which does not support drag-out file creation).
- **Search → drag the hit-count chip to the desktop** (Chrome/Edge) or click
  its download icon (all browsers) to export the current search results.

The collection menu also has **"Copy link"**, which puts the `link.html` deep
link on the clipboard.

A launcher file (`TabNinja - <name>.html`) is fully self-contained:

1. A clickable list of all bookmarks — works everywhere, extension or not.
2. Install detection: a hidden probe image loads a web-accessible extension
   asset. If it loads, the page auto-redirects to the solo view; if not, it
   shows "TheTab.Ninja isn't installed here" and the link list remains. It
   never navigates to a dead `chrome-extension://` URL.
3. An embedded JSON payload for other tools (see below).

Because extension ids differ per install (and Firefox uses a random per-install
UUID), auto-open only works in the browser profile that created the file. The
link list and JSON payload work everywhere.

## Embedded JSON (integration reference)

Inside every launcher file:

```html
<script type="application/json" id="tabninja-data">…</script>
```

Collection export (`schema: "thetab.ninja/collection"`):

```json
{
  "schema": "thetab.ninja/collection",
  "schemaVersion": 1,
  "generator": "TheTab.Ninja/1.2",
  "exportedAt": "2026-07-22T12:00:00.000Z",
  "extensionUrl": "chrome-extension://<id>/link.html?collection=<uuid>&name=<name>",
  "collection": {
    "id": "<uuid>",
    "name": "Work",
    "spaces": ["Everything", "Work"],
    "bookmarks": [
      { "id": "<uuid>", "title": "Example", "url": "https://example.com",
        "description": "", "position": 0, "tags": ["reading"], "icon": "https://..." }
    ]
  }
}
```

Search-selection export (`schema: "thetab.ninja/selection"`) is the same shape
with `"query": "<search term>"` and a `"collections": [...]` array (one entry
per source collection) instead of `"collection"`.

Notes for consumers:

- Parse with any HTML parser (`getElementById('tabninja-data')`) or a regex on
  the script block; the JSON contains no raw `<` characters (escaped as `<`).
- `tags` and `icon` are optional per bookmark. Only http(s) URLs are included.
- `schemaVersion` increments on breaking changes; additive fields may appear
  without a version bump.

## Browser differences

| | Chrome | Edge | Firefox |
|---|---|---|---|
| Drag collection/search to desktop → file | ✅ | ✅ | ❌ (`DownloadURL` unsupported — use the menu item / chip download button) |
| Drag single bookmark to desktop → web shortcut | ✅ | ✅ | ✅ (`text/x-moz-url`) |
| Launcher auto-open via install detection | ✅ | ✅ | ✅ (per-install UUID: only on the creating machine) |
| Deep links (`bm.html?...` / `link.html?...`) | ✅ | ✅ | ✅ |
