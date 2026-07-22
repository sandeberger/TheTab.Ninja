/**
 * link.js - Redirect logic for link.html, the web-accessible deep-link entry.
 * Launcher files on the desktop (file://) and external pages can only navigate
 * to web_accessible_resources, so this tiny page forwards whitelisted params
 * to bm.html and nothing else.
 */
(function () {
    const ALLOWED_PARAMS = ['collection', 'name', 'bookmark', 'launch', 'space', 'tag', 'q'];

    let incoming;
    try {
        incoming = new URLSearchParams(window.location.search);
    } catch (e) {
        incoming = new URLSearchParams();
    }

    const outgoing = new URLSearchParams();
    for (const key of ALLOWED_PARAMS) {
        const value = incoming.get(key);
        if (value !== null && value !== '') {
            outgoing.set(key, value);
        }
    }

    const query = outgoing.toString();
    window.location.replace('bm.html' + (query ? '?' + query : ''));
})();
