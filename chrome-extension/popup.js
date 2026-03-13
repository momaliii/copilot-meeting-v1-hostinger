let timerInterval = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

// ── Check connection ──
function checkConnection() {
  const dot = document.getElementById('connectionDot');
  getAppUrl((appUrl) => {
    fetch(`${appUrl.replace(/\/$/, '')}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) })
      .then((r) => {
        dot.classList.toggle('online', r.ok);
        dot.classList.toggle('offline', !r.ok);
        dot.title = r.ok ? 'Connected to app' : 'App unreachable';
      })
      .catch(() => {
        dot.classList.add('offline');
        dot.title = 'App unreachable';
      });
  });
}

// ── Load branding ──
function loadBranding() {
  getBranding((branding) => {
    document.getElementById('siteName').textContent = branding.siteName;
    const container = document.getElementById('logoContainer');
    if (branding.logoUrl) {
      container.innerHTML = `<img src="${branding.logoUrl}" alt="Logo">`;
    }
  });
}

// ── Recording state ──
function pollRecordingState() {
  chrome.runtime.sendMessage({ type: 'getRecordingState' }, (state) => {
    if (chrome.runtime.lastError || !state) return;

    const banner = document.getElementById('recBanner');
    const idle = document.getElementById('idleState');

    if (state.active) {
      banner.classList.add('active');
      banner.classList.toggle('paused', state.paused);
      idle.style.display = 'none';
      document.getElementById('recPlatform').textContent =
        state.paused ? `${state.platform} (Paused)` : `Recording ${state.platform}`;
      document.getElementById('recTimer').textContent = formatTime(state.elapsed || 0);

      const pauseBtn = document.getElementById('pauseBtn');
      if (state.paused) {
        pauseBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume`;
      } else {
        pauseBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Pause`;
      }

      if (!timerInterval && !state.paused) {
        let elapsed = state.elapsed || 0;
        timerInterval = setInterval(() => {
          elapsed++;
          document.getElementById('recTimer').textContent = formatTime(elapsed);
        }, 1000);
      }
      if (state.paused && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    } else {
      banner.classList.remove('active');
      idle.style.display = 'block';
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  });
}

// ── Recent recordings ──
function loadRecentRecordings() {
  chrome.storage.local.get(['recordingHistory'], (result) => {
    const history = (result.recordingHistory || []).slice(0, 3);
    const section = document.getElementById('recentSection');
    const list = document.getElementById('recentList');
    if (history.length === 0) return;

    section.classList.add('has-items');
    list.innerHTML = '';

    history.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'recent-item';
      div.innerHTML = `
        <div class="recent-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
        </div>
        <div class="recent-info">
          <div class="recent-name">${item.title || item.platform}</div>
          <div class="recent-meta">${formatDate(item.date)} &middot; ${formatTime(item.duration || 0)}</div>
        </div>
      `;
      div.addEventListener('click', () => {
        getAppUrl((appUrl) => {
          chrome.tabs.create({ url: `${appUrl}?view=history` });
        });
      });
      list.appendChild(div);
    });
  });
}

// ── Button handlers ──
getAppUrl((appUrl) => {
  document.getElementById('startBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${appUrl}?start=record` });
  });
  document.getElementById('dashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${appUrl}?view=dashboard` });
  });
});

document.getElementById('pauseBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'getRecordingState' }, (state) => {
    if (!state?.active || !state.tabId) return;
    chrome.tabs.sendMessage(state.tabId, {
      type: state.paused ? 'resumeRecording' : 'pauseRecording',
    });
    setTimeout(pollRecordingState, 300);
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'getRecordingState' }, (state) => {
    if (!state?.active || !state.tabId) return;
    chrome.tabs.sendMessage(state.tabId, { type: 'stopRecording' });
    setTimeout(pollRecordingState, 500);
  });
});

document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ── Init ──
checkConnection();
loadBranding();
pollRecordingState();
loadRecentRecordings();
