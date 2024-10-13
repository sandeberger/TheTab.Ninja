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
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl === "chrome://newtab/" || tab.url === "chrome://newtab/") {
    chrome.tabs.update(tab.id, { url: "https://kodar.ninja/bm.html" });
  }
});