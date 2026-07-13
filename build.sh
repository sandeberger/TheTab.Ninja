#!/usr/bin/env bash
# Build distributable packages for Chrome and Firefox.
#
# Usage:
#   ./build.sh            # builds both dist/chrome and dist/firefox (+ zips)
#   ./build.sh chrome     # builds only the Chrome package
#   ./build.sh firefox    # builds only the Firefox package
#
# The source tree is shared between browsers; only the manifest differs:
#   manifest.json         -> Chrome  (MV3 service worker)
#   manifest.firefox.json -> Firefox (MV3 event page + browser_specific_settings)
set -euo pipefail

cd "$(dirname "$0")"

TARGETS=("${1:-all}")
[ "${TARGETS[0]}" = "all" ] && TARGETS=(chrome firefox)

# Files/directories shipped in every package.
# Note: bm.js is the legacy monolith and is NOT loaded by bm.html (js/ modules are),
# so it is intentionally excluded from packages.
SHARED=(
  bm.html
  popup.html
  popup.js
  background.js
  styles.css
  tabninja_help.html
  github-setup-guide.html
  js
  assets
  LICENSE
)

VERSION=$(grep -oE '"version": *"[^"]+"' manifest.json | head -1 | grep -oE '[0-9.]+')

for target in "${TARGETS[@]}"; do
  out="dist/$target"
  rm -rf "$out"
  mkdir -p "$out"

  cp -r "${SHARED[@]}" "$out/"

  case "$target" in
    chrome)  cp manifest.json "$out/manifest.json" ;;
    firefox) cp manifest.firefox.json "$out/manifest.json" ;;
    *) echo "Unknown target: $target (use chrome|firefox|all)" >&2; exit 1 ;;
  esac

  zip_name="dist/thetab-ninja-${target}-v${VERSION}.zip"
  rm -f "$zip_name"
  (cd "$out" && zip -qr "../$(basename "$zip_name")" .)
  echo "Built $out and $zip_name"
done

echo
echo "Test in Chrome : chrome://extensions -> Load unpacked -> dist/chrome"
echo "Test in Firefox: about:debugging#/runtime/this-firefox -> Load Temporary Add-on -> dist/firefox/manifest.json"
echo "               or: npx web-ext run --source-dir dist/firefox"
