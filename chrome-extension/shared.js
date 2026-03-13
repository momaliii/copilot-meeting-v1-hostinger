const DEFAULT_APP_URL = '__APP_URL__';

function getAppUrl(callback) {
  chrome.storage.sync.get(['appUrl'], (result) => {
    const url = result.appUrl || DEFAULT_APP_URL;
    callback(url === '__APP_URL__' ? 'http://localhost:3000' : url);
  });
}

function getAppUrlAsync() {
  return new Promise((resolve) => getAppUrl(resolve));
}

function getSettings(callback) {
  const defaults = {
    appUrl: null,
    includeMic: true,
    autoDetect: true,
    showNotifications: true,
    autoCollapse: false,
    recordingQuality: 'medium',
  };
  chrome.storage.sync.get(Object.keys(defaults), (result) => {
    callback({ ...defaults, ...result });
  });
}

function getBranding(callback) {
  chrome.storage.local.get(['branding', 'brandingFetchedAt'], (result) => {
    const age = Date.now() - (result.brandingFetchedAt || 0);
    if (result.branding && age < 5 * 60 * 1000) {
      callback(result.branding);
      return;
    }
    getAppUrl((appUrl) => {
      const url = `${appUrl.replace(/\/$/, '')}/api/public/branding`;
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            const branding = {
              siteName: data.site_name || 'Meeting Copilot',
              logoUrl: data.logo_url || null,
              themeColor: data.theme_color || '#4f46e5',
            };
            chrome.storage.local.set({ branding, brandingFetchedAt: Date.now() });
            callback(branding);
          } else {
            callback(result.branding || { siteName: 'Meeting Copilot', logoUrl: null, themeColor: '#4f46e5' });
          }
        })
        .catch(() => {
          callback(result.branding || { siteName: 'Meeting Copilot', logoUrl: null, themeColor: '#4f46e5' });
        });
    });
  });
}

function getPlatformName() {
  const host = window.location?.hostname || '';
  if (host.includes('meet.google.com')) return 'Google Meet';
  if (host.includes('zoom.us')) return 'Zoom';
  if (host.includes('teams.microsoft.com')) return 'Teams';
  return 'Meeting';
}

function getQualityBitrate(quality) {
  const map = { low: 64000, medium: 128000, high: 256000 };
  return map[quality] || 128000;
}
