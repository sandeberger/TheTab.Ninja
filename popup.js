document.addEventListener('DOMContentLoaded', () => {
  const newTabButton = document.getElementById('newTabButton');
  newTabButton.addEventListener('click', () => {
    chrome.tabs.create({ url: "https://kodar.ninja/bm.html" });
  });

  chrome.windows.getAll({ populate: true }, (windows) => {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = ''; // Rensa innehållet
    windows.forEach((window) => {
      // Skapa div för fönstret
      const windowDiv = document.createElement('div');
      windowDiv.className = 'window';

      // Titel för att visa/gömma flikarna
      const windowTitle = document.createElement('div');
      windowTitle.className = 'window-title';
      windowTitle.textContent = `Window ID: ${window.id} (${window.tabs.length} flikar)`;
      windowDiv.appendChild(windowTitle);

      // Lista med flikar (initialt dold)
      const tabsList = document.createElement('div');
      tabsList.className = 'tabs-list';

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

      // Klickhändelse för att visa/gömma fliklistan
      windowTitle.addEventListener('click', () => {
        tabsList.style.display = tabsList.style.display === 'none' ? 'block' : 'none';
      });
    });
  });
});