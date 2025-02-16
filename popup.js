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
    contentDiv.innerHTML = ''; // Clear the content

    chrome.storage.local.get('windowStates', (data) => {
      const windowStates = data.windowStates || {}; // Get saved states or default empty object

      windows.forEach((window) => {
        // Create div for window
        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';

        // Title to toggle tabs visibility
        const windowTitle = document.createElement('div');
        windowTitle.className = 'window-title';
        windowTitle.textContent = `Window ID: ${window.id} (${window.tabs.length} tabs)`;
        windowDiv.appendChild(windowTitle);

        // Create list of tabs (initially hidden or visible based on saved state)
        const tabsList = document.createElement('div');
        tabsList.className = 'tabs-list';

        // Set the initial state of the tabs (collapsed or expanded)
        if (windowStates[window.id] === 'open') {
          tabsList.style.display = 'block';
        } else {
          tabsList.style.display = 'none';
        }

        window.tabs.forEach((tab) => {
          const tabDiv = document.createElement('div');
          tabDiv.className = 'tab';

          // Icon for the tab
          const tabIcon = document.createElement('img');
          tabIcon.src = tab.favIconUrl || 'https://via.placeholder.com/16';
          tabDiv.appendChild(tabIcon);

          // Title and description of the tab
          const tabTitle = document.createElement('span');
          tabTitle.className = 'tab-title';
          tabTitle.textContent = tab.title;
          tabTitle.title = tab.url;  // Hover shows URL
          tabTitle.addEventListener('click', () => {
            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(window.id, { focused: true });
          });

          tabDiv.appendChild(tabTitle);
          tabsList.appendChild(tabDiv);
        });

        windowDiv.appendChild(tabsList);
        contentDiv.appendChild(windowDiv);

        // Toggle event for showing/hiding the tabs and saving the state
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
