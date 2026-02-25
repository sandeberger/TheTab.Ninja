document.addEventListener('DOMContentLoaded', () => {
  const collectionInput = document.getElementById('collectionInput');
  const collectionsList = document.getElementById('collectionsList');
  const saveTabButton = document.getElementById('saveTabButton');

  // Fetch bookmarkManagerData from the extension's localStorage
  let rawData = localStorage.getItem('bookmarkManagerData');
  if (!rawData) return;

  let bookmarkManagerData;
  try {
    bookmarkManagerData = JSON.parse(rawData);
  } catch (error) {
    console.error("Error parsing bookmarkManagerData:", error);
    return;
  }

  // Filter out deleted collections
  const validCollections = (bookmarkManagerData.collections || []).filter(c => !c.deleted);

  // Fill the datalist with existing collection names
  validCollections.forEach(collection => {
    const optionEl = document.createElement('option');
    optionEl.value = collection.name || "Unnamed";
    collectionsList.appendChild(optionEl);
  });

  saveTabButton.addEventListener('click', () => {
    const inputName = collectionInput.value.trim();
    if (!inputName) {
      alert("Ange ett namn på collection.");
      return;
    }

    // Find collection with matching name (case-insensitive)
    let matchedCollection = validCollections.find(c => c.name.toLowerCase() === inputName.toLowerCase());

    // If not found, ask if we should create a new one
    if (!matchedCollection) {
      const createNew = confirm(`Collection "${inputName}" finns inte. Vill du skapa en ny?`);
      if (!createNew) {
        window.close();
        return;
      }
      // Create a new collection with spaces property
      matchedCollection = {
        id: generateUUID(),
        name: inputName,
        isOpen: true,
        bookmarks: [],
        lastModified: Date.now(),
        deleted: false,
        position: bookmarkManagerData.collections.length,
        spaces: ['Everything']
      };
      // Add the new collection to the total list
      bookmarkManagerData.collections.push(matchedCollection);
      validCollections.push(matchedCollection);
      // Also add to datalist so it shows next time
      const optionEl = document.createElement('option');
      optionEl.value = matchedCollection.name;
      collectionsList.appendChild(optionEl);
    }

    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs || !tabs.length) {
        window.close();
        return;
      }
      const currentTab = tabs[0];
      // Create a new bookmark
      const newBookmark = {
        id: generateUUID(),
        title: currentTab.title,
        url: currentTab.url,
        description: "",
        icon: currentTab.favIconUrl || "assets/icons/default-icon.png",
        lastModified: Date.now(),
        deleted: false,
        position: matchedCollection.bookmarks.length
      };

      // Re-read fresh data from localStorage before writing back to avoid overwriting concurrent changes
      const freshRaw = localStorage.getItem('bookmarkManagerData');
      const freshData = freshRaw ? JSON.parse(freshRaw) : bookmarkManagerData;
      // Find or add the collection in fresh data
      let freshCollection = freshData.collections.find(c => c.id === matchedCollection.id);
      if (!freshCollection) {
        freshData.collections.push(matchedCollection);
        freshCollection = matchedCollection;
      }
      freshCollection.bookmarks.push(newBookmark);
      freshCollection.lastModified = Date.now();
      localStorage.setItem('bookmarkManagerData', JSON.stringify(freshData));

      // If the setting "closeWhenSaveTab" is set, close the tab
      if (freshData.closeWhenSaveTab) {
          // Show message in popup
          const msgEl = document.createElement('div');
          msgEl.textContent = "Tab is moved to collection!\nYou may need to refresh the\nthetab.ninja webpage to see the change.'";
          msgEl.style.padding = "10px";
          msgEl.style.background = "#e0ffe0";
          msgEl.style.textAlign = "center";
          document.body.appendChild(msgEl);
          setTimeout(() => {
            chrome.tabs.remove(currentTab.id, function() {
              if (chrome.runtime.lastError) {
                console.error("Error removing tab:", chrome.runtime.lastError);
              }
              // After the current tab is closed, get the active tab in the window
              chrome.tabs.query({ active: true, currentWindow: true }, function(activeTabs) {
                if (activeTabs && activeTabs[0]) {
                  const tab = activeTabs[0];
                  // Only reload if it's an extension page
                  if (tab.url && tab.url.startsWith(chrome.runtime.getURL(''))) {
                    chrome.tabs.reload(tab.id);
                  }
                }
                // Close the popup after a short delay
                setTimeout(() => window.close(), 100);
              });
            });
          }, 2000);


      } else {
        const msgEl = document.createElement('div');
          msgEl.textContent = "Tab copied successfully!\nYou may need to refresh the\nthetab.ninja webpage to see the change.'";
          msgEl.style.padding = "10px";
          msgEl.style.background = "#e0ffe0";
          msgEl.style.textAlign = "center";
          document.body.appendChild(msgEl);
          setTimeout(() => window.close(), 2000);
      }
    });
  });
});

// UUID generator using crypto API
function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
