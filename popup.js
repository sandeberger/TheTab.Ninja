document.addEventListener('DOMContentLoaded', () => {
  const collectionInput = document.getElementById('collectionInput');
  const collectionsList = document.getElementById('collectionsList');
  const saveTabButton = document.getElementById('saveTabButton');

  let rawData = localStorage.getItem('bookmarkManagerData');
  if (!rawData) return;

  let bookmarkManagerData;
  try {
    bookmarkManagerData = JSON.parse(rawData);
  } catch {
    return;
  }

  const validCollections = (bookmarkManagerData.collections || []).filter(c => !c.deleted);

  validCollections.forEach(collection => {
    const optionEl = document.createElement('option');
    optionEl.value = collection.name || "Unnamed";
    collectionsList.appendChild(optionEl);
  });

  saveTabButton.addEventListener('click', () => {
    const selectedName = collectionInput.value.trim();
    if (!selectedName) {
      window.close();
      return;
    }

    const matchedCollection = validCollections.find(c => c.name === selectedName);
    if (!matchedCollection) {
      window.close();
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs || !tabs.length) {
        window.close();
        return;
      }

      const currentTab = tabs[0];
      const newBookmark = {
        id: generateUUID(),
        title: currentTab.title,
        url: currentTab.url,
        description: "",
        icon: currentTab.favIconUrl || "default-icon.png",
        lastModified: Date.now(),
        deleted: false,
        position: matchedCollection.bookmarks.length
      };

      matchedCollection.bookmarks.push(newBookmark);
      matchedCollection.lastModified = Date.now();
      localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));

      if (bookmarkManagerData.closeWhenSaveTab) {
        chrome.tabs.remove(currentTab.id, () => window.close());
        alert('Tab moved successfully!\nYou may need to refresh the thefile.ninja webpage to see the change.');
      } else {
        window.close();
        alert('Tab copied successfully!\nYou may need to refresh the thefile.ninja webpage to see the change.');
      }
    });
  });
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
