const DEFAULT_APP_URL = '__APP_URL__';

function isValidUrl(string) {
  try {
    const u = new URL(string);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function showStatus(text, type) {
  const el = document.getElementById('statusMsg');
  el.textContent = text;
  el.className = `status-msg visible ${type}`;
  setTimeout(() => el.classList.remove('visible'), 3000);
}

// ── Load Settings ──

function loadSettings() {
  chrome.storage.sync.get(
    ['appUrl', 'includeMic', 'autoDetect', 'showNotifications', 'autoCollapse', 'recordingQuality'],
    (result) => {
      const appUrl = result.appUrl || DEFAULT_APP_URL;
      document.getElementById('appUrl').value = appUrl === '__APP_URL__' ? '' : appUrl;
      document.getElementById('includeMic').checked = result.includeMic !== false;
      document.getElementById('autoDetect').checked = result.autoDetect !== false;
      document.getElementById('showNotifications').checked = result.showNotifications !== false;
      document.getElementById('autoCollapse').checked = result.autoCollapse === true;
      document.getElementById('recordingQuality').value = result.recordingQuality || 'medium';
    }
  );
}

// ── Save Settings ──

document.getElementById('saveBtn').addEventListener('click', async () => {
  const url = document.getElementById('appUrl').value.trim();

  if (url && !isValidUrl(url)) {
    showStatus('Please enter a valid URL.', 'error');
    return;
  }

  await chrome.storage.sync.set({
    appUrl: url || null,
    includeMic: document.getElementById('includeMic').checked,
    autoDetect: document.getElementById('autoDetect').checked,
    showNotifications: document.getElementById('showNotifications').checked,
    autoCollapse: document.getElementById('autoCollapse').checked,
    recordingQuality: document.getElementById('recordingQuality').value,
  });

  showStatus('Settings saved.', 'success');
});

// ── Connection Test ──

document.getElementById('testBtn').addEventListener('click', async () => {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.style.display = 'inline-block';
  dot.className = 'status-dot testing';
  text.textContent = 'Testing...';

  const url = document.getElementById('appUrl').value.trim();
  const appUrl = (url || (DEFAULT_APP_URL === '__APP_URL__' ? 'http://localhost:3000' : DEFAULT_APP_URL)).replace(/\/$/, '');

  try {
    const start = Date.now();
    const res = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
    const elapsed = Date.now() - start;
    if (res.ok) {
      dot.className = 'status-dot success';
      text.textContent = `Connected (${elapsed}ms)`;
      text.style.color = '#16a34a';
    } else {
      dot.className = 'status-dot error';
      text.textContent = `Server responded ${res.status}`;
      text.style.color = '#dc2626';
    }
  } catch (err) {
    dot.className = 'status-dot error';
    text.textContent = 'Could not connect';
    text.style.color = '#dc2626';
  }
});

// ── Branding ──

function loadBranding() {
  getBranding((branding) => {
    document.getElementById('pageTitle').textContent = `${branding.siteName} Settings`;
    const container = document.getElementById('logoContainer');
    if (branding.logoUrl) {
      container.innerHTML = `<img src="${branding.logoUrl}" alt="Logo">`;
    }
  });
}

// ── Init ──
loadSettings();
loadBranding();
