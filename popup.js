document.addEventListener('DOMContentLoaded', () => {
  const collectionInput = document.getElementById('collectionInput');
  const collectionsList = document.getElementById('collectionsList');
  const saveTabButton = document.getElementById('saveTabButton');

  // Hämta bookmarkManagerData från extensionens localStorage
  let rawData = localStorage.getItem('bookmarkManagerData');
  if (!rawData) return;

  let bookmarkManagerData;
  try {
    bookmarkManagerData = JSON.parse(rawData);
  } catch (error) {
    console.error("Fel vid parsing av bookmarkManagerData:", error);
    return;
  }

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
      alert("Ange ett namn på collection.");
      return;
    }

    // Hitta collection med matchande namn (case-insensitive)
    let matchedCollection = validCollections.find(c => c.name.toLowerCase() === inputName.toLowerCase());

    // Om den inte finns, fråga om vi ska skapa en ny
    if (!matchedCollection) {
      const createNew = confirm(`Collection "${inputName}" finns inte. Vill du skapa en ny?`);
      if (!createNew) {
        window.close();
        return;
      }
      // Skapa en ny collection
      matchedCollection = {
        id: generateUUID(),
        name: inputName,
        isOpen: true,
        bookmarks: [],
        lastModified: Date.now(),
        deleted: false,
        position: bookmarkManagerData.collections.length
      };
      // Lägg till den nya collectionen i den totala listan
      bookmarkManagerData.collections.push(matchedCollection);
      validCollections.push(matchedCollection);
      // Lägg även till i datalistan så att den syns nästa gång
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
      // Skapa ett nytt bokmärke
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

      // Spara tillbaka all data
      localStorage.setItem('bookmarkManagerData', JSON.stringify(bookmarkManagerData));

      // Om inställningen "closeWhenSaveTab" är satt, stäng tabben
      if (bookmarkManagerData.closeWhenSaveTab) {
          // Visa meddelande i popupen
          const msgEl = document.createElement('div');
          msgEl.textContent = "Tab is moved to collection!\nYou may need to refresh the\nthetab.ninja webpage to see the change.'";
          msgEl.style.padding = "10px";
          msgEl.style.background = "#e0ffe0";
          msgEl.style.textAlign = "center";
          document.body.appendChild(msgEl);
          setTimeout(() => {
            chrome.tabs.remove(currentTab.id, function() {
              if (chrome.runtime.lastError) {
                console.error("Fel vid borttagning av tab:", chrome.runtime.lastError);
              }
              // Efter att den aktuella tabben stängts, hämta den aktiva tabben i fönstret
              chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs[0]) {
                  // Tvinga om-laddning på den aktiva tabben
                  chrome.tabs.reload(tabs[0].id);
                }
                // Stäng popupen efter en kort fördröjning
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

// Enkel UUID-generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

