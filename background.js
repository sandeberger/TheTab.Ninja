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
    chrome.windows.getAll({ populate: true }, async (windows) => {
      const result = [];
      // För varje fönster hämtas även tab-grupper
      for (const window of windows) {
        const groups = await new Promise((resolve) => {
          chrome.tabGroups.query({ windowId: window.id }, resolve);
        });
        const mappedGroups = groups.map(g => ({
          groupId: g.id,
          title: g.title,
          color: g.color
        }));
        const tabs = window.tabs.map(tab => ({
          tabId: tab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          groupId: tab.groupId
        }));
        result.push({
          windowId: window.id,
          tabs: tabs,
          groups: mappedGroups
        });
      }
      sendResponse(result);
    });
    return true;
  } else if (message.action === 'switchToTab') {
    chrome.windows.update(parseInt(message.windowId), { focused: true }, () => {
      chrome.tabs.update(parseInt(message.tabId), { active: true }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error updating tab:", chrome.runtime.lastError);
        }
        sendResponse({ success: true });
      });
    });
    return true;
  }else if (message.action === 'fetchFavicon') {
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
          sendResponse({ faviconUrl: 'assets/icons/default-icon.png' }); // Om favicon inte hittas
        }
      } catch (error) {
        console.error('Error fetching favicon:', error);
        sendResponse({ faviconUrl: 'assets/icons/default-icon.png' }); // Vid fel, returnera default favicon
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
    // Testa repository access
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
        throw new Error(`Repository "${username}/${repo}" hittades inte`);
      } else if (repoResponse.status === 401) {
        throw new Error('Autentisering misslyckades');
      }
      throw new Error(`Kunde inte nå repository: ${repoResponse.statusText}`);
    }

    // Hämta filinnehåll via Contents API:t
    const fileResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${filepath}`,
      {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!fileResponse.ok) {
      if (fileResponse.status === 404) {
        return { content: null };
      }
      throw new Error(`Kunde inte hämta filen: ${fileResponse.statusText}`);
    }

    const fileData = await fileResponse.json();

    // Om filinnehållet finns direkt (filens storlek är under gränsen)
    if (fileData.content) {
      const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
      return { content: JSON.parse(decodedContent) };
    }

    // Om content saknas men download_url finns (filen är t.ex. över 1 MB)
    if (fileData.download_url) {
      // Försök hämta via download_url med Authorization-header
      let downloadResponse = await fetch(fileData.download_url, {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (downloadResponse.ok) {
        const rawContent = await downloadResponse.text();
        return { content: JSON.parse(rawContent) };
      } else {
        // Vid 404 eller andra fel – försök hämta via Git Blobs API:t
        const blobResponse = await fetch(
          `https://api.github.com/repos/${username}/${repo}/git/blobs/${fileData.sha}`,
          {
            headers: {
              'Authorization': `Bearer ${pat}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (!blobResponse.ok) {
          throw new Error(`Misslyckades hämta blob: ${blobResponse.statusText}`);
        }
        const blobData = await blobResponse.json();
        const decodedContent = decodeURIComponent(escape(atob(blobData.content)));
        return { content: JSON.parse(decodedContent) };
      }
    }
    throw new Error('Filen innehåller varken content eller download_url');
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
