// This script is used in the popup of a Chrome extension. It adds functionality to create a new tab
// and displays all open windows and their tabs. Users can click on a tab title to activate the tab
// and focus the window. The list of tabs in each window can be toggled by clicking on the window title.

document.addEventListener('DOMContentLoaded', () => {
  const newTabButton = document.getElementById('newTabButton');
  newTabButton.addEventListener('click', () => {
    chrome.tabs.create({ url: "bm.html" });
  });

  chrome.windows.getAll({ populate: true }, (windows) => {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = ''; // Rensa innehållet

    chrome.storage.local.get('windowStates', (data) => {
      const windowStates = data.windowStates || {}; // Hämta sparat tillstånd

      windows.forEach((window) => {
        // Skapa div för fönstret
        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';

        // Titel för att visa/gömma flikarna
        const windowTitle = document.createElement('div');
        windowTitle.className = 'window-title';
        windowTitle.textContent = `Window ID: ${window.id} (${window.tabs.length} flikar)`;
        windowDiv.appendChild(windowTitle);

        // Lista med flikar (initialt dold eller synlig enligt sparat tillstånd)
        const tabsList = document.createElement('div');
        tabsList.className = 'tabs-list';
        tabsList.style.display = windowStates[window.id] === 'open' ? 'block' : 'none';

        window.tabs.forEach((tab) => {
          const tabDiv = document.createElement('div');
          tabDiv.className = 'tab';

          // Ikon för sidan
          const tabIcon = document.createElement('img');
          tabIcon.src = tab.favIconUrl || 'https://via.placeholder.com/16';
          tabDiv.appendChild(tabIcon);

          // Titel och beskrivning för sidan
          const tabTitle = document.createElement('span');
          tabTitle.className = 'tab-title';
          tabTitle.textContent = tab.title;
          tabTitle.title = tab.url;  // Beskrivning visas när man hovrar
          tabTitle.addEventListener('click', () => {
            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(window.id, { focused: true });
          });

          tabDiv.appendChild(tabTitle);
          tabsList.appendChild(tabDiv);
        });

        windowDiv.appendChild(tabsList);
        contentDiv.appendChild(windowDiv);

        // Klickhändelse för att visa/gömma fliklistan och spara tillstånd
        windowTitle.addEventListener('click', () => {
          const isNowOpen = tabsList.style.display === 'none' ? 'open' : 'closed';
          tabsList.style.display = isNowOpen === 'open' ? 'block' : 'none';

          chrome.storage.local.get('windowStates', (data) => {
            const updatedStates = data.windowStates || {};
            updatedStates[window.id] = isNowOpen;
            chrome.storage.local.set({ windowStates: updatedStates });
          });
        });
      });
    });
  });
});
