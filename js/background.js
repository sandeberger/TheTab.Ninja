chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  } else if (message.action === "fetchFromGoogleDrive") {
    handleGoogleDriveFetch(message.config).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  } else if (message.action === "pushToGoogleDrive") {
    handleGoogleDrivePush(message.config, message.content).then(sendResponse).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  } else if (message.action === "authenticateGoogleDrive") {
    getGoogleDriveToken().then(token => {
      sendResponse({ success: true, token });
    }).catch(error => {
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
  } else if (message.action === 'createManualBackup') {
    createManualBackup(message.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  } else if (message.action === 'getBookmarkData') {
    // Popup requests data - try chrome.storage.local
    chrome.storage.local.get(['bookmarkManagerData'], (result) => {
      sendResponse({ data: result.bookmarkManagerData || null });
    });
    return true;
  } else if (message.action === 'clearGoogleDriveAuth') {
    // Clear cached Google Drive auth token
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  } else {
    // Unknown action
    console.debug('Unknown message action:', message.action);
    sendResponse({ error: 'Unknown action: ' + message.action });
    return false;
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl === "chrome://newtab/" || tab.url === "chrome://newtab/") {
    chrome.tabs.update(tab.id, { url: "bm.html" });    
  }
});

async function handleGitHubFetch(config) {
  const { username, repo, pat, filepath } = config;
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
        throw new Error(`Repository "${username}/${repo}" not found`);
      } else if (repoResponse.status === 401) {
        throw new Error('Authentication failed');
      }
      throw new Error(`Could not reach repository: ${repoResponse.statusText}`);
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
      throw new Error(`Could not download the file: ${fileResponse.statusText}`);
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
          throw new Error(`Failed to retrieve blob: ${blobResponse.statusText}`);
        }
        const blobData = await blobResponse.json();
        const decodedContent = decodeURIComponent(escape(atob(blobData.content)));
        return { content: JSON.parse(decodedContent) };
      }
    }
    throw new Error('The file contains neither content nor download_url');
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
          content: btoa(new TextEncoder().encode(JSON.stringify(content, null, 2)).reduce((s, b) => s + String.fromCharCode(b), '')),
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

// Strip sensitive tokens from data before writing to backup files
function sanitizeBackupData(data) {
  const sanitized = JSON.parse(JSON.stringify(data));
  if (sanitized.githubConfig) {
    delete sanitized.githubConfig.pat;
  }
  if (sanitized.syncConfig && sanitized.syncConfig.providers && sanitized.syncConfig.providers.github) {
    delete sanitized.syncConfig.providers.github.pat;
  }
  return sanitized;
}

// Backup Functions
async function createAutomaticBackup(data) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `tabninja-backup-${timestamp}-${timeString}.json`;

    // Create data URL directly (works in service worker)
    const jsonString = JSON.stringify(sanitizeBackupData(data), null, 2);
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
          // Remove the actual file from disk, then erase the download record
          await chrome.downloads.removeFile(download.id).catch(() => {});
          await chrome.downloads.erase({ id: download.id });
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
      
      // If no data in chrome.storage, get from active tab's localStorage
      if (!data) {
        const tabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
        if (tabs.length > 0) {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: () => {
                const stored = localStorage.getItem('bookmarkManagerData');
                return stored ? JSON.parse(stored) : null;
              }
            });
            data = results[0]?.result;
          } catch (scriptError) {
            console.error('Error getting data from tab:', scriptError);
          }
        }
      }
      
      if (data && data.autoBackup && data.autoBackup.frequency !== 'disabled') {
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
          
          // Update localStorage in active tab
          const tabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
          if (tabs.length > 0) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (updatedData) => {
                  localStorage.setItem('bookmarkManagerData', JSON.stringify(updatedData));
                },
                args: [data]
              });
            } catch (scriptError) {
              console.error('Error updating localStorage:', scriptError);
            }
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


// Manual backup function (same as automatic backup)
async function createManualBackup(data) {
  // Manual backups use the same logic as automatic backups
  return await createAutomaticBackup(data);
}

// Google Drive API Functions
async function getGoogleDriveToken() {
  return new Promise((resolve, reject) => {
    // Try non-interactive first (uses cached token, no popup)
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        resolve(token);
      } else {
        // No cached token — fall back to interactive (shows sign-in popup)
        chrome.identity.getAuthToken({ interactive: true }, (token2) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (token2) {
            resolve(token2);
          } else {
            reject(new Error('No token received'));
          }
        });
      }
    });
  });
}

async function handleGoogleDriveFetch(config) {
    const token = await getGoogleDriveToken();
    const { fileId, fileName } = config;

    // If we have a fileId, try to download that specific file
    if (fileId) {
      return await downloadGoogleDriveFile(token, fileId);
    }

    // Otherwise, search for the file by name
    const foundFileId = await findGoogleDriveFile(token, fileName);
    if (foundFileId) {
      return await downloadGoogleDriveFile(token, foundFileId);
    }

    // File not found
    return { content: null };
}

async function handleGoogleDrivePush(config, content) {
    const token = await getGoogleDriveToken();
    const { fileId, fileName } = config;

    const jsonContent = JSON.stringify(content, null, 2);

    if (fileId) {
      // Update existing file
      await updateGoogleDriveFile(token, fileId, jsonContent);
      return { success: true, fileId };
    } else {
      // Create new file or find existing one
      const foundFileId = await findGoogleDriveFile(token, fileName);
      if (foundFileId) {
        await updateGoogleDriveFile(token, foundFileId, jsonContent);
        // Return the found fileId so it can be saved in config
        return { success: true, fileId: foundFileId };
      } else {
        const newFileId = await createGoogleDriveFile(token, fileName, jsonContent);
        return { success: true, fileId: newFileId };
      }
    }
}

async function findGoogleDriveFile(token, fileName) {
  const query = encodeURIComponent(`name='${fileName}' and trashed=false`);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to search for file (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function downloadGoogleDriveFile(token, fileId) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      return { content: null };
    }
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const text = await response.text();
  return { content: JSON.parse(text) };
}

async function createGoogleDriveFile(token, fileName, content) {
  const metadata = {
    name: fileName,
    parents: ['appDataFolder']
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));
  
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.id;
}

async function updateGoogleDriveFile(token, fileId, content) {
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: content
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.statusText}`);
  }
  
  return await response.json();
}
