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
    windows.forEach((window) => {
      // Create div for the window
      const windowDiv = document.createElement('div');
      windowDiv.className = 'window';

      // Title to show/hide the tabs
      const windowTitle = document.createElement('div');
      windowTitle.className = 'window-title';
      windowTitle.textContent = `Window ID: ${window.id} (${window.tabs.length} tabs)`;
      windowDiv.appendChild(windowTitle);

      // List of tabs (initially hidden)
      const tabsList = document.createElement('div');
      tabsList.className = 'tabs-list';

      window.tabs.forEach((tab) => {
        const tabDiv = document.createElement('div');
        tabDiv.className = 'tab';

        // Icon for the page
        const tabIcon = document.createElement('img');
        tabIcon.src = tab.favIconUrl || 'https://via.placeholder.com/16';
        tabDiv.appendChild(tabIcon);

        // Title and description for the page
        const tabTitle = document.createElement('span');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = tab.title;
        tabTitle.title = tab.url;  // Description shown when hovering
        tabTitle.addEventListener('click', () => {
          chrome.tabs.update(tab.id, { active: true });
          chrome.windows.update(window.id, { focused: true });
        });

        tabDiv.appendChild(tabTitle);
        tabsList.appendChild(tabDiv);
      });

      windowDiv.appendChild(tabsList);
      contentDiv.appendChild(windowDiv);

      // Click event to show/hide the tab list
      windowTitle.addEventListener('click', () => {
        tabsList.style.display = tabsList.style.display === 'none' ? 'block' : 'none';
      });
    });
  });
});
