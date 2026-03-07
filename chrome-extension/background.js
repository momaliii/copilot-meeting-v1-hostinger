const DEFAULT_APP_URL = '__APP_URL__';

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      const url = result.appUrl || DEFAULT_APP_URL;
      resolve(url === '__APP_URL__' ? 'http://localhost:3000' : url);
    });
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-copilot') {
    const appUrl = await getAppUrl();
    chrome.tabs.create({ url: `${appUrl}?start=record` });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'record-with-copilot',
    title: 'Record this tab with Meeting Copilot',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'record-with-copilot' && tab?.id) {
    const appUrl = await getAppUrl();
    const tabUrl = tab.url ? `&tabUrl=${encodeURIComponent(tab.url)}` : '';
    chrome.tabs.create({ url: `${appUrl}?start=record${tabUrl}` });
  }
});

// Relay audio blob from meeting tab to app tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'extensionAudioToApp') {
    const { arrayBuffer, mimeType, action } = message;
    getAppUrl().then((appUrl) => {
      const appOrigin = new URL(appUrl).origin;
      chrome.tabs.query({ url: `${appOrigin}/*` }, (tabs) => {
        let targetTab = tabs[0];
        if (!targetTab) {
          chrome.tabs.create({ url: `${appUrl}?start=record` }, (newTab) => {
            waitForTabLoad(newTab.id, () => {
              sendToAppTab(newTab.id, arrayBuffer, mimeType, action, sendResponse);
            });
          });
        } else {
          chrome.tabs.update(targetTab.id, { active: true });
          sendToAppTab(targetTab.id, arrayBuffer, mimeType, action, sendResponse);
        }
      });
    });
    return true;
  }

  // Phase 3: Direct API analyze - extension calls /api/analyze, then hands off result
  if (message.type === 'extensionAnalyzeDirectly') {
    const { arrayBuffer, mimeType, durationSeconds } = message;
    handleDirectAnalyze(arrayBuffer, mimeType, durationSeconds || 0, sendResponse);
    return true;
  }

  return false;
});

async function handleDirectAnalyze(arrayBuffer, mimeType, durationSeconds, sendResponse) {
  try {
    const appUrl = await getAppUrl();
    const baseUrl = appUrl.replace(/\/$/, '');
    const token = await getTokenFromAppOrStorage(baseUrl);
    if (!token) {
      sendResponse({ ok: false, fallback: true });
      return;
    }

    const blob = new Blob([arrayBuffer], { type: mimeType || 'audio/webm' });
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const formData = new FormData();
    formData.append('audio', blob, `recording.${ext}`);
    formData.append('language', 'Original Language');
    formData.append('extraRules', '');
    formData.append('isPro', 'false');

    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const text = await res.text();
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      analysis = null;
    }

    if (!res.ok) {
      sendResponse({ ok: false, fallback: true });
      return;
    }

    const appOrigin = new URL(appUrl).origin;
    chrome.tabs.query({ url: `${appOrigin}/*` }, async (tabs) => {
      let targetTab = tabs[0];
      if (!targetTab) {
        chrome.tabs.create({ url: `${baseUrl}/?start=record` }, (newTab) => {
          waitForTabLoad(newTab.id, () => {
            sendAnalyzedToAppTab(newTab.id, arrayBuffer, mimeType, analysis, durationSeconds, sendResponse);
          });
        });
      } else {
        chrome.tabs.update(targetTab.id, { active: true });
        sendAnalyzedToAppTab(targetTab.id, arrayBuffer, mimeType, analysis, durationSeconds, sendResponse);
      }
    });
  } catch (err) {
    console.error('Direct analyze failed:', err);
    sendResponse({ ok: false, fallback: true });
  }
}

function getTokenFromAppOrStorage(baseUrl) {
  return new Promise((resolve) => {
    chrome.storage.session.get(['authToken'], (result) => {
      if (result.authToken) {
        resolve(result.authToken);
        return;
      }
      const appOrigin = new URL(baseUrl).origin;
      chrome.tabs.query({ url: `${appOrigin}/*` }, (tabs) => {
        let targetTab = tabs[0];
        if (!targetTab) {
          resolve(null);
          return;
        }
        chrome.tabs.sendMessage(targetTab.id, { type: 'getToken' }, (response) => {
          if (chrome.runtime.lastError || !response?.token) {
            resolve(null);
            return;
          }
          chrome.storage.session.set({ authToken: response.token });
          resolve(response.token);
        });
      });
    });
  });
}

function sendAnalyzedToAppTab(tabId, arrayBuffer, mimeType, analysis, durationSeconds, sendResponse, retries = 3) {
  chrome.tabs.sendMessage(tabId, {
    type: 'extensionAnalyzed',
    arrayBuffer,
    mimeType,
    analysis,
    durationSeconds: durationSeconds || 0,
  }, (response) => {
    if (chrome.runtime.lastError && retries > 0) {
      setTimeout(() => sendAnalyzedToAppTab(tabId, arrayBuffer, mimeType, analysis, durationSeconds, sendResponse, retries - 1), 500);
    } else if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse(response || { ok: true });
    }
  });
}

function waitForTabLoad(tabId, callback) {
  const listener = (id, info) => {
    if (id === tabId && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      callback();
    }
  };
  chrome.tabs.onUpdated.addListener(listener);
  chrome.tabs.get(tabId, (tab) => {
    if (tab.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      callback();
    }
  });
}

function sendToAppTab(tabId, arrayBuffer, mimeType, action, sendResponse, retries = 3) {
  chrome.tabs.sendMessage(tabId, {
    type: 'extensionAudio',
    arrayBuffer,
    mimeType,
    action,
  }, (response) => {
    if (chrome.runtime.lastError && retries > 0) {
      setTimeout(() => sendToAppTab(tabId, arrayBuffer, mimeType, action, sendResponse, retries - 1), 500);
    } else if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse(response || { ok: true });
    }
  });
}
