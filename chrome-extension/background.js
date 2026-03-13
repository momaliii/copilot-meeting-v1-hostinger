const DEFAULT_APP_URL = '__APP_URL__';

function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      const url = result.appUrl || DEFAULT_APP_URL;
      resolve(url === '__APP_URL__' ? 'http://localhost:3000' : url);
    });
  });
}

// ── Recording State ──

let recordingState = {
  active: false,
  paused: false,
  startTime: 0,
  pausedElapsed: 0,
  platform: '',
  tabId: null,
};

function updateBadge() {
  if (!recordingState.active) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  if (recordingState.paused) {
    chrome.action.setBadgeText({ text: '||' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  } else {
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  }
}

async function showNotification(title, message) {
  const settings = await new Promise((r) => chrome.storage.sync.get(['showNotifications'], r));
  if (settings.showNotifications === false) return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title,
    message,
    silent: true,
  });
}

// ── Recording History ──

async function addRecordingToHistory(entry) {
  const result = await chrome.storage.local.get(['recordingHistory']);
  const history = result.recordingHistory || [];
  history.unshift(entry);
  if (history.length > 10) history.length = 10;
  await chrome.storage.local.set({ recordingHistory: history });
}

// ── Branding Cache ──

async function getCachedBranding() {
  const result = await chrome.storage.local.get(['branding', 'brandingFetchedAt']);
  const age = Date.now() - (result.brandingFetchedAt || 0);
  if (result.branding && age < 5 * 60 * 1000) return result.branding;

  try {
    const appUrl = await getAppUrl();
    const res = await fetch(`${appUrl.replace(/\/$/, '')}/api/public/branding`);
    if (res.ok) {
      const data = await res.json();
      const branding = {
        siteName: data.site_name || 'Meeting Copilot',
        logoUrl: data.logo_url || null,
        themeColor: data.theme_color || '#4f46e5',
      };
      await chrome.storage.local.set({ branding, brandingFetchedAt: Date.now() });
      return branding;
    }
  } catch {}

  return result.branding || { siteName: 'Meeting Copilot', logoUrl: null, themeColor: '#4f46e5' };
}

// ── Commands ──

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-copilot') {
    const appUrl = await getAppUrl();
    chrome.tabs.create({ url: `${appUrl}?start=record` });
  }
});

// ── Context Menu ──

chrome.runtime.onInstalled.addListener(async () => {
  const branding = await getCachedBranding();
  chrome.contextMenus.create({
    id: 'record-with-copilot',
    title: `Record this tab with ${branding.siteName}`,
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

// ── Message Handling ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  if (message.type === 'recordingStarted') {
    recordingState = {
      active: true,
      paused: false,
      startTime: Date.now(),
      pausedElapsed: 0,
      platform: message.platform || 'Meeting',
      tabId: sender.tab?.id || null,
    };
    updateBadge();
    showNotification('Recording Started', `Recording ${recordingState.platform}`);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'recordingPaused') {
    recordingState.paused = true;
    recordingState.pausedElapsed = message.elapsed || 0;
    updateBadge();
    showNotification('Recording Paused', `${recordingState.platform} recording paused`);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'recordingResumed') {
    recordingState.paused = false;
    updateBadge();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'recordingStopped') {
    const duration = message.duration || 0;
    const platform = recordingState.platform;
    recordingState = { active: false, paused: false, startTime: 0, pausedElapsed: 0, platform: '', tabId: null };
    updateBadge();
    showNotification('Recording Stopped', `${platform} recording saved (${formatDuration(duration)})`);
    addRecordingToHistory({
      platform,
      duration,
      date: new Date().toISOString(),
      title: `${platform} Recording`,
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'getRecordingState') {
    const elapsed = recordingState.active && !recordingState.paused
      ? Math.floor((Date.now() - recordingState.startTime) / 1000)
      : recordingState.pausedElapsed || 0;
    sendResponse({
      ...recordingState,
      elapsed,
    });
    return true;
  }

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

  if (message.type === 'extensionAnalyzeDirectly') {
    const { arrayBuffer, mimeType, durationSeconds } = message;
    handleDirectAnalyze(arrayBuffer, mimeType, durationSeconds || 0, sendResponse);
    return true;
  }

  return false;
});

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Direct Analyze ──

async function handleDirectAnalyze(arrayBuffer, mimeType, durationSeconds, sendResponse) {
  try {
    const appUrl = await getAppUrl();
    const baseUrl = appUrl.replace(/\/$/, '');
    const token = await getTokenFromAppOrStorage(baseUrl);
    if (!token) {
      sendResponse({ ok: false, fallback: true });
      return;
    }

    const safeMimeType = mimeType || 'audio/webm';
    const blob = new Blob([arrayBuffer], { type: safeMimeType });
    const ext = safeMimeType.includes('mp4') ? 'mp4' : safeMimeType.includes('ogg') ? 'ogg' : 'webm';
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

    showNotification('Analysis Complete', 'Your meeting analysis is ready.');

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
