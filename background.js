console.log('Background service worker starting...');

// Helper: Decode base64 to UTF-8 (replaces deprecated escape/unescape)
function base64ToUtf8(base64) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Helper: Encode UTF-8 to base64 (replaces deprecated escape/unescape)
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: SSRF protection - validate that URL is public and uses http(s)
function isPublicUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const hostname = url.hostname;
    if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|localhost|::1|\[::1\])/.test(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// SINGLE unified onMessage listener for all actions
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

  } else if (message.action === "getCurrentWindowId") {
    // Use sender.tab.windowId to identify which window the request came from
    const windowId = sender && sender.tab ? sender.tab.windowId : null;
    sendResponse({ windowId: windowId });
    return false;

  } else if (message.action === "getTabs") {
    chrome.windows.getAll({ populate: true }, async (windows) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting windows:', chrome.runtime.lastError);
        sendResponse([]);
        return;
      }
      const result = [];
      for (const window of windows) {
        let groups = [];
        try {
          groups = await new Promise((resolve, reject) => {
            chrome.tabGroups.query({ windowId: window.id }, (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result || []);
              }
            });
          });
        } catch (e) {
          console.warn('Could not query tab groups for window:', window.id, e);
          groups = [];
        }
        const mappedGroups = (groups || []).map(g => ({
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
      if (chrome.runtime.lastError) {
        console.error("Error focusing window:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      chrome.tabs.update(parseInt(message.tabId), { active: true }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error updating tab:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ success: true });
      });
    });
    return true;

  } else if (message.action === 'fetchFavicon') {
    const { url } = message;

    // SSRF protection: validate URL before fetching
    if (!isPublicUrl(url)) {
      sendResponse({
        faviconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzQ1NmJmNiIvPgo8cGF0aCBkPSJNOCAxMkgxNlY4SDE4VjEySDI0VjE0SDI0VjIwSDI0VjI0SDhWMjBIOFYxNEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
      });
      return true;
    }

    // Improved favicon fetching with multiple fallbacks
    async function fetchGoogleFavicon(url) {
      try {
        const domain = new URL(url).hostname;

        // Try multiple favicon sources in order of reliability
        const faviconSources = [
          `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          `https://favicons.githubusercontent.com/${domain}`,
          `https://${domain}/favicon.ico`,
          // Fallback to a generic icon if all fail
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzQ1NmJmNiIvPgo8cGF0aCBkPSJNOCAxMkgxNlY4SDE4VjEySDI0VjE0SDI0VjIwSDI0VjI0SDhWMjBIOFYxNEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+'
        ];

        // Try each source until one works
        for (const faviconUrl of faviconSources) {
          try {
            // For data URLs, skip the fetch and use directly
            if (faviconUrl.startsWith('data:')) {
              sendResponse({ faviconUrl });
              return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(faviconUrl, {
              method: 'HEAD', // Only check if resource exists
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              sendResponse({ faviconUrl });
              return;
            }
          } catch (err) {
            // Classify and handle different types of network errors silently
            if (err.name === 'AbortError') {
              console.debug('Favicon fetch timeout (suppressed):', faviconUrl);
            } else if (err.message && err.message.includes('ERR_CONNECTION_TIMED_OUT')) {
              console.debug('Connection timeout (suppressed):', faviconUrl);
            } else if (err.message && err.message.includes('ERR_NAME_NOT_RESOLVED')) {
              console.debug('DNS resolution failed (suppressed):', faviconUrl);
            } else {
              console.debug('Favicon fetch failed (suppressed):', err.message || 'Unknown error');
            }
            continue;
          }
        }

        // If all sources fail, use the embedded SVG fallback
        sendResponse({
          faviconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzQ1NmJmNiIvPgo8cGF0aCBkPSJNOCAxMkgxNlY4SDE4VjEySDI0VjE0SDI0VjIwSDI0VjI0SDhWMjBIOFYxNEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
        });

      } catch (error) {
        console.error('Error fetching favicon:', error);
        // Return embedded SVG as ultimate fallback
        sendResponse({
          faviconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzQ1NmJmNiIvPgo8cGF0aCBkPSJNOCAxMkgxNlY4SDE4VjEySDI0VjE0SDI0VjIwSDI0VjI0SDhWMjBIOFYxNEg4VjEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
        });
      }
    }

    fetchGoogleFavicon(url);
    return true;

  } else if (message.action === 'launchCollection') {
    const urls = message.urls;
    const collectionName = message.collectionName;

    let tabsProcessed = 0;
    let firstError = null;
    const tabIds = [];

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      sendResponse({ success: false, error: 'No URLs provided' });
      return true;
    }

    urls.forEach((url) => {
      chrome.tabs.create({ url }, (tab) => {
        tabsProcessed++;
        if (chrome.runtime.lastError) {
          if (!firstError) firstError = chrome.runtime.lastError.message;
        } else {
          tabIds.push(tab.id);
        }
        if (tabsProcessed === urls.length) {
          if (tabIds.length === 0) {
            sendResponse({ success: false, error: firstError });
            return;
          }
          chrome.tabs.group({ tabIds }, (groupId) => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            chrome.tabGroups.update(groupId, {
              title: collectionName, color: "blue", collapsed: true
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error updating tab group:', chrome.runtime.lastError);
              }
              sendResponse({ success: true });
            });
          });
        }
      });
    });

    return true;

  } else if (message.action === 'createManualBackup') {
    createManualBackup(message.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl === "chrome://newtab/" || tab.url === "chrome://newtab/") {
    chrome.tabs.update(tab.id, { url: "bm.html" });
  }
});

// Debounced notification: broadcast tab changes to all bm.html pages
let _tabChangeTimeout = null;
function notifyTabsChanged() {
  if (_tabChangeTimeout) clearTimeout(_tabChangeTimeout);
  _tabChangeTimeout = setTimeout(async () => {
    _tabChangeTimeout = null;
    try {
      const bmTabs = await chrome.tabs.query({ url: chrome.runtime.getURL('bm.html') });
      for (const t of bmTabs) {
        chrome.tabs.sendMessage(t.id, { action: 'tabsChanged' }).catch(() => {});
      }
    } catch (e) {
      // Extension context may be invalidated
    }
  }, 300);
}

chrome.tabs.onCreated.addListener(notifyTabsChanged);
chrome.tabs.onRemoved.addListener(notifyTabsChanged);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.title) {
    notifyTabsChanged();
  }
});
chrome.tabs.onMoved.addListener(notifyTabsChanged);
chrome.tabs.onAttached.addListener(notifyTabsChanged);
chrome.tabs.onDetached.addListener(notifyTabsChanged);

async function handleGitHubFetch(config) {
  const { username, repo, pat, filepath } = config;

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
    throw new Error(`Could not reach repository: ${repoResponse.statusText}`);
  }

  // Fetch file content via Contents API
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
    throw new Error(`Could not download the file: ${fileResponse.statusText}`);
  }

  const fileData = await fileResponse.json();

  // If file content is available directly (file size is under the limit)
  if (fileData.content) {
    const decodedContent = base64ToUtf8(fileData.content);
    return { content: JSON.parse(decodedContent) };
  }

  // If content is missing but download_url exists (file is over 1 MB)
  if (fileData.download_url) {
    // Try to fetch via download_url with Authorization header
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
      // On 404 or other errors - try fetching via Git Blobs API
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
        throw new Error(`Failed to retrieve blob: ${blobResponse.statusText}`);
      }
      const blobData = await blobResponse.json();
      const decodedContent = base64ToUtf8(blobData.content);
      return { content: JSON.parse(decodedContent) };
    }
  }
  throw new Error('The file contains neither content nor download_url');
}


async function handleGitHubPush(config, content) {
  const { username, repo, pat, filepath } = config;
  try {
    // Fetch repo metadata to get default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}`,
      {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repo metadata: ${repoResponse.status} ${repoResponse.statusText}`);
    }
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Get latest commit SHA
    const refResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/ref/heads/${defaultBranch}`,
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
          content: utf8ToBase64(JSON.stringify(content, null, 2)),
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

    // Update reference (force: false to avoid overwriting concurrent changes)
    const updateRefResponse = await fetch(
      `https://api.github.com/repos/${username}/${repo}/git/refs/heads/${defaultBranch}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false
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

// Backup Functions
async function createAutomaticBackup(data) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `tabninja-backup-${timestamp}-${timeString}.json`;

    // Create data URL directly (works in service worker)
    const jsonString = JSON.stringify(data, null, 2);
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);

    // Try to use custom folder if available and supported
    if (data.autoBackup && data.autoBackup.useCustomFolder && data.autoBackup.customFolderName) {
      try {
        const downloadId = await chrome.downloads.download({
          url: dataUrl,
          filename: `${data.autoBackup.customFolderName}/${filename}`,
          saveAs: false
        });

        console.log('Backup created successfully in custom folder:', filename);
        return { success: true, filename, downloadId };
      } catch (customError) {
        console.warn('Custom folder backup failed, falling back to Downloads:', customError);
      }
    }

    // Default: use Downloads folder
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });

    console.log('Backup created successfully:', filename);
    return { success: true, filename, downloadId };
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function cleanupOldBackups(keepDays = 7) {
  try {
    const downloads = await chrome.downloads.search({
      filenameRegex: 'tabninja-backup-.*\\.json$'
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    for (const download of downloads) {
      if (download.startTime && new Date(download.startTime) < cutoffDate) {
        try {
          // First try to remove the actual file from disk
          try {
            await new Promise((resolve, reject) => {
              chrome.downloads.removeFile(download.id, () => {
                if (chrome.runtime.lastError) {
                  // File may already be deleted, continue anyway
                  resolve();
                } else {
                  resolve();
                }
              });
            });
          } catch (e) { /* ignore - file may already be gone */ }
          // Then erase the download record
          await new Promise(resolve => chrome.downloads.erase({ id: download.id }, resolve));
          console.log('Cleaned up old backup:', download.filename);
        } catch (error) {
          console.warn('Could not clean up backup:', download.filename, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

async function shouldCreateBackup(lastBackup, frequency) {
  if (!lastBackup) return true;

  const lastBackupDate = new Date(lastBackup);
  const now = new Date();

  switch (frequency) {
    case 'daily':
      return now.getDate() !== lastBackupDate.getDate() ||
             now.getMonth() !== lastBackupDate.getMonth() ||
             now.getFullYear() !== lastBackupDate.getFullYear();
    case 'weekly':
      const weekDiff = Math.floor((now - lastBackupDate) / (7 * 24 * 60 * 60 * 1000));
      return weekDiff >= 1;
    default:
      return false;
  }
}

// Setup backup alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyBackup') {
    try {
      // Get current data from both storage locations
      let data = null;

      // First try chrome.storage.local
      try {
        const result = await chrome.storage.local.get(['bookmarkManagerData']);
        data = result.bookmarkManagerData;
      } catch (storageError) {
        console.log('Chrome storage not available, checking tabs for localStorage');
      }

      // chrome.storage.local is the single source of truth for the service worker.
      // The front-end (bm.html) mirrors data here on every save.

      if (data && data.autoBackup && data.autoBackup.enabled) {
        const needsBackup = await shouldCreateBackup(
          data.autoBackup.lastBackup,
          data.autoBackup.frequency
        );

        if (needsBackup) {
          await createAutomaticBackup(data);
          await cleanupOldBackups(data.autoBackup.keepDays || 7);

          // Update last backup timestamp
          data.autoBackup.lastBackup = new Date().toISOString();

          // Try to update both storage locations
          try {
            await chrome.storage.local.set({ bookmarkManagerData: data });
          } catch (storageError) {
            console.log('Could not update chrome.storage.local:', storageError);
          }

          console.log('Automatic backup completed');
        }
      }
    } catch (error) {
      console.error('Error during automatic backup:', error);
    }
  }
});

// Initialize backup alarm on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('dailyBackup', {
    delayInMinutes: 1,
    periodInMinutes: 60 // Check every hour
  });
});

// Also create alarm on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('dailyBackup', {
    delayInMinutes: 1,
    periodInMinutes: 60 // Check every hour
  });
});

// Manual backup function - uses the download-based backup approach
async function createManualBackup(data) {
  try {
    return await createAutomaticBackup(data);
  } catch (error) {
    console.error('Error creating manual backup:', error);
    throw error;
  }
}
