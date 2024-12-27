console.log('Background service worker starting...');
//chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  if (message.action === "fetchFromGitHub") {
    handleGitHubFetch(message.config).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  } else if (message.action === "pushToGitHub") {
    handleGitHubPush(message.config, message.content).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  } else if (message.action === "getTabs") {
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
    chrome.tabs.update(tab.id, { url: "bm.html" });
  }
});

async function handleGitHubFetch(config) {
  const { username, repo, pat, filepath } = config;
  try {
    // Test repository access
    const repoResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}`,
      {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error(`Repository "${username}/${repo}" not found`);
      } else if (repoResponse.status === 401) {
        throw new Error('Authentication failed');
      }
      throw new Error(`Failed to access repository: ${repoResponse.statusText}`);
    }

    // Fetch file content
    const fileResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${filepath}`,
      {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (fileResponse.ok) {
      const fileData = await fileResponse.json();
      const content = decodeURIComponent(escape(atob(fileData.content)));
      return { content: JSON.parse(content) };
    } else if (fileResponse.status === 404) {
      return { content: null };
    }

    throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
  } catch (error) {
    throw error;
  }
}

async function handleGitHubPush(config, content) {
  const { username, repo, pat, filepath } = config;
  try {
    // Get latest commit SHA
    const refResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/ref/heads/main`,
      {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (!refResponse.ok) {
      throw new Error(`Failed to fetch ref: ${refResponse.status} ${refResponse.statusText}`);
    }
    
    const refData = await refResponse.json();
    const latestCommitSha = refData.object.sha;

    // Get latest commit data
    const commitResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/commits/${latestCommitSha}`,
      {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (!commitResponse.ok) {
      throw new Error(`Failed to fetch commit data: ${commitResponse.status} ${commitResponse.statusText}`);
    }
    
    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // Create new blob
    const blobResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/blobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
          encoding: 'base64'
        })
      }
    );

    if (!blobResponse.ok) {
      const errorData = await blobResponse.json();
      throw new Error(`Failed to create blob: ${blobResponse.status} ${blobResponse.statusText} - ${JSON.stringify(errorData)}`);
    }

    const blobData = await blobResponse.json();

    // Create new tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: [{
            path: filepath,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha
          }]
        })
      }
    );

    if (!treeResponse.ok) {
      throw new Error(`Failed to create tree: ${treeResponse.status} ${treeResponse.statusText}`);
    }

    const treeData = await treeResponse.json();

    // Create new commit
    const commitCreateResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update bookmarks',
          tree: treeData.sha,
          parents: [latestCommitSha]
        })
      }
    );

    if (!commitCreateResponse.ok) {
      throw new Error(`Failed to create commit: ${commitCreateResponse.status} ${commitCreateResponse.statusText}`);
    }

    const newCommitData = await commitCreateResponse.json();

    // Update reference
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/refs/heads/main`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: true
        })
      }
    );

    if (!updateRefResponse.ok) {
      throw new Error(`Failed to update ref: ${updateRefResponse.status} ${updateRefResponse.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Detailed error in handleGitHubPush:', error);
    throw error;
  }
}
