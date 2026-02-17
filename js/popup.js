document.addEventListener('DOMContentLoaded', () => {
  const collectionInput = document.getElementById('collectionInput');
  const collectionsList = document.getElementById('collectionsList');
  const saveTabButton = document.getElementById('saveTabButton');

  // Use chrome.storage.local which is accessible from popup context
  chrome.storage.local.get(['bookmarkManagerData'], (result) => {
    let bookmarkManagerData = result.bookmarkManagerData;

    // Fallback: try to get data from an open new tab page via messaging
    if (!bookmarkManagerData) {
      chrome.runtime.sendMessage({ action: 'getBookmarkData' }, (response) => {
        if (response && response.data) {
          initPopup(response.data);
        } else {
          document.body.innerHTML = '<div style="padding:16px;text-align:center;color:#666;">No data found. Please open a new tab first.</div>';
        }
      });
      return;
    }

    initPopup(bookmarkManagerData);
  });

  function initPopup(bookmarkManagerData) {
    // Filtrera bort raderade collections
    const validCollections = (bookmarkManagerData.collections || []).filter(c => !c.deleted);

    // Fyll datalistan med befintliga collection-namn
    validCollections.forEach(collection => {
      const optionEl = document.createElement('option');
      optionEl.value = collection.name || "Unnamed";
      collectionsList.appendChild(optionEl);
    });

    saveTabButton.addEventListener('click', () => {
      const inputName = collectionInput.value.trim();
      if (!inputName) {
        alert("Enter a collection name.");
        return;
      }

      // Hitta collection med matchande namn (case-insensitive)
      let matchedCollection = validCollections.find(c => c.name.toLowerCase() === inputName.toLowerCase());

      // Om den inte finns, skapa en ny
      if (!matchedCollection) {
        const createNew = confirm(`Collection "${inputName}" doesn't exist. Create a new one?`);
        if (!createNew) {
          window.close();
          return;
        }
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
        bookmarkManagerData.collections.push(matchedCollection);
        validCollections.push(matchedCollection);
        const optionEl = document.createElement('option');
        optionEl.value = matchedCollection.name;
        collectionsList.appendChild(optionEl);
      }

      // Hämta den aktiva tabben
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
          icon: currentTab.favIconUrl || "images/icons/default-icon.png",
          lastModified: Date.now(),
          deleted: false,
          position: matchedCollection.bookmarks.length
        };

        matchedCollection.bookmarks.push(newBookmark);
        matchedCollection.lastModified = Date.now();

        // Save to chrome.storage.local (accessible from all extension contexts)
        chrome.storage.local.set({ bookmarkManagerData: bookmarkManagerData }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving data:", chrome.runtime.lastError);
          }
        });

        // Also notify any open new tab pages to reload data
        chrome.runtime.sendMessage({ action: 'bookmarkDataUpdated', data: bookmarkManagerData });

        if (bookmarkManagerData.closeWhenSaveTab) {
          showMessage("Tab saved to collection!");
          setTimeout(() => {
            chrome.tabs.remove(currentTab.id, function() {
              if (chrome.runtime.lastError) {
                console.error("Error removing tab:", chrome.runtime.lastError);
              }
              setTimeout(() => window.close(), 100);
            });
          }, 1500);
        } else {
          showMessage("Bookmark saved!");
          setTimeout(() => window.close(), 1500);
        }
      });
    });
  }

  function showMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.textContent = text;
    msgEl.style.padding = "10px";
    msgEl.style.background = "#e0ffe0";
    msgEl.style.textAlign = "center";
    msgEl.style.borderRadius = "4px";
    msgEl.style.marginTop = "8px";
    document.body.appendChild(msgEl);
  }
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
