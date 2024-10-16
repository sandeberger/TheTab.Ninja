chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.action === "getTabs") {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const result = windows.map((window) => ({
        windowId: window.id,
        tabs: window.tabs.map((tab) => ({
          tabId: tab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl
        }))
      }));
      sendResponse(result);
    });
    return true;  // Indikerar att svaret sker asynkront
  } else if (message.action === 'fetchFavicon') {
    const { url } = message;

    // Asynkron funktion för att hämta favicon från Googles S2-tjänst
    async function fetchGoogleFavicon(url) {
      try {
        const domain = new URL(url).hostname;
        const faviconUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=32`;
        //const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        const response = await fetch(faviconUrl);
        if (response.ok) {
          sendResponse({ faviconUrl }); // Returnera favicon URL
        } else {
          sendResponse({ faviconUrl: 'default-icon.png' }); // Om favicon inte hittas
        }
      } catch (error) {
        console.error('Error fetching favicon:', error);
        sendResponse({ faviconUrl: 'default-icon.png' }); // Vid fel, returnera default favicon
      }
    }

    // Anropa funktionen för att hämta favicon
    fetchGoogleFavicon(url);

    return true; // Behöver returnera true för att indikera asynkron hantering
  } else if (message.action === 'launchCollection') {
    const urls = message.urls;
    const collectionName = message.collectionName;

    const tabIds = [];
    let tabsCreated = 0;

    // Öppna varje URL i en ny tab och samla deras tabIds
    urls.forEach((url) => {
      chrome.tabs.create({ url: url }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Error creating tab:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError });
          return;
        }
        tabIds.push(tab.id);
        tabsCreated++;

        // När alla tabbar har skapats
        if (tabsCreated === urls.length) {
          // Gruppera dem
          chrome.tabs.group({ tabIds: tabIds }, (groupId) => {
            if (chrome.runtime.lastError) {
              console.error('Error grouping tabs:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError });
              return;
            }
            // Uppdatera gruppens titel och färg
            chrome.tabGroups.update(groupId, {
              title: collectionName,
              color: "blue",
              collapsed: true
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error updating tab group:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError });
                return;
              }
              sendResponse({ success: true });
            });
          });
        }
      });
    });

    return true;
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl === "chrome://newtab/" || tab.url === "chrome://newtab/") {
    chrome.tabs.update(tab.id, { url: "https://kodar.ninja/bm.html" });
  }
});

