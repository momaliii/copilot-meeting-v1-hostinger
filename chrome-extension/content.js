// Content script for Google Meet, Zoom, and Teams pages

const WIDGET_STYLES = `
  :host {
    all: initial;
    position: fixed;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .widget {
    background: white;
    border-radius: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.06);
    overflow: hidden;
    min-width: 220px;
    transition: opacity 0.2s, transform 0.2s;
    cursor: default;
    user-select: none;
  }
  .widget.collapsed {
    min-width: 0;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: #4f46e5;
    border: 2px solid rgba(255,255,255,0.3);
  }
  .widget.collapsed.recording {
    background: #dc2626;
    animation: pulse-widget 2s ease-in-out infinite;
  }
  .widget.collapsed.paused-state {
    background: #f59e0b;
    animation: none;
  }
  @keyframes pulse-widget {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
    50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
  }
  .collapsed-icon {
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .widget-header {
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: grab;
    border-bottom: 1px solid #f1f5f9;
    background: #fafafa;
  }
  .widget-header:active { cursor: grabbing; }
  .header-logo {
    width: 22px; height: 22px;
    background: #4f46e5;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: white; flex-shrink: 0;
  }
  .header-title {
    font-size: 12px; font-weight: 600;
    color: #334155; flex: 1;
  }
  .header-actions {
    display: flex; gap: 4px;
  }
  .header-btn {
    width: 22px; height: 22px;
    border-radius: 6px;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    color: #94a3b8;
    transition: all 0.15s;
  }
  .header-btn:hover { background: #f1f5f9; color: #64748b; }
  .header-btn.close-btn:hover { background: #fef2f2; color: #ef4444; }

  .widget-body { padding: 12px 14px; }

  .hint-text {
    font-size: 11px; color: #94a3b8;
    line-height: 1.4; margin-bottom: 10px;
  }
  .shortcut-hint {
    font-size: 10px; color: #cbd5e1;
    margin-top: 6px;
  }
  .shortcut-hint kbd {
    background: #f1f5f9; border: 1px solid #e2e8f0;
    border-radius: 3px; padding: 1px 4px;
    font-size: 10px; font-family: inherit;
  }

  /* Buttons */
  .btn {
    display: flex; align-items: center; justify-content: center;
    gap: 6px;
    padding: 9px 14px;
    border-radius: 9px;
    font-size: 13px; font-weight: 600;
    cursor: pointer; border: none;
    transition: all 0.15s;
    width: 100%;
  }
  .btn + .btn { margin-top: 6px; }
  .btn-primary {
    background: #4f46e5; color: white;
    box-shadow: 0 2px 4px rgba(79,70,229,0.2);
  }
  .btn-primary:hover { background: #4338ca; transform: translateY(-1px); }
  .btn-danger { background: #dc2626; color: white; }
  .btn-danger:hover { background: #b91c1c; }
  .btn-secondary {
    background: white; color: #334155;
    border: 1px solid #e2e8f0;
  }
  .btn-secondary:hover { background: #f8fafc; }
  .btn-warning {
    background: #f59e0b; color: white;
  }
  .btn-warning:hover { background: #d97706; }
  .btn-ghost {
    background: none; color: #64748b;
    font-size: 12px; padding: 4px 0;
  }
  .btn-ghost:hover { color: #4f46e5; }

  .btn-row { display: flex; gap: 6px; }
  .btn-row .btn { flex: 1; }

  /* Timer */
  .timer {
    font-size: 26px; font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #0f172a;
    text-align: center;
    margin-bottom: 10px;
  }
  .timer.paused-timer { color: #d97706; }

  .status-text {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
    text-align: center; margin-bottom: 6px;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .status-text.recording-status { color: #dc2626; }
  .status-text.paused-status { color: #d97706; }
  .status-text.done-status { color: #16a34a; }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor;
    animation: blink 1.5s ease-in-out infinite;
  }
  .paused-status .status-dot { animation: none; }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* Mic toggle */
  .mic-toggle {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; margin-top: 8px;
    background: #f8fafc; border-radius: 8px;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    font-size: 12px; color: #334155;
  }
  .mic-toggle input { accent-color: #4f46e5; }
  .mic-toggle:hover { background: #f1f5f9; }

  /* Toast for auto-detect */
  .toast {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: linear-gradient(135deg, #eef2ff, #e0e7ff);
    border: 1px solid #c7d2fe;
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .toast-text {
    flex: 1; font-size: 12px;
    color: #3730a3; font-weight: 500;
  }
  .toast-actions { display: flex; gap: 4px; }
  .toast-btn {
    padding: 5px 10px; border-radius: 6px;
    font-size: 11px; font-weight: 600;
    cursor: pointer; border: none;
    transition: all 0.15s;
  }
  .toast-btn-primary { background: #4f46e5; color: white; }
  .toast-btn-primary:hover { background: #4338ca; }
  .toast-btn-dismiss { background: transparent; color: #6366f1; }
  .toast-btn-dismiss:hover { background: rgba(99,102,241,0.1); }
`;

let mediaRecorder = null;
let audioChunks = [];
let streamRef = null;
let micStreamRef = null;
let audioCtxRef = null;
let timerInterval = null;
let recordingSeconds = 0;
let isPaused = false;
let widgetHost = null;
let shadowRoot = null;
let isCollapsed = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let meetingDetected = false;
let meetingDetectObserver = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function stopAllTracks() {
  if (streamRef) {
    streamRef.getTracks().forEach((t) => t.stop());
    streamRef = null;
  }
  if (micStreamRef) {
    micStreamRef.getTracks().forEach((t) => t.stop());
    micStreamRef = null;
  }
  if (audioCtxRef) {
    audioCtxRef.close().catch(() => {});
    audioCtxRef = null;
  }
}

function getPlatformHint() {
  const host = window.location.hostname;
  if (host.includes('meet.google.com')) return 'Choose "Share tab" and check "Share tab audio".';
  if (host.includes('zoom.us')) return 'Share screen and enable "Share computer sound".';
  if (host.includes('teams.microsoft.com')) return 'Share screen and include system audio.';
  return 'Share tab audio when sharing your screen.';
}

// ── Widget Injection ──

function injectWidget() {
  if (document.getElementById('copilot-widget-host')) return;

  widgetHost = document.createElement('div');
  widgetHost.id = 'copilot-widget-host';
  shadowRoot = widgetHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = WIDGET_STYLES;
  shadowRoot.appendChild(style);

  // Load saved position
  chrome.storage.local.get(['widgetPos'], (result) => {
    const pos = result.widgetPos || { bottom: 24, left: 24 };
    widgetHost.style.cssText = `position:fixed;bottom:${pos.bottom}px;left:${pos.left}px;z-index:2147483647;`;
  });

  const widget = document.createElement('div');
  widget.className = 'widget';
  widget.id = 'copilot-widget';
  shadowRoot.appendChild(widget);

  setupDragging(widget);
  showIdleUI();

  document.body.appendChild(widgetHost);

  // Auto-collapse check
  chrome.storage.sync.get(['autoCollapse'], (result) => {
    if (result.autoCollapse) {
      setTimeout(() => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          collapseWidget();
        }
      }, 5000);
    }
  });

  // Auto-detect meeting
  chrome.storage.sync.get(['autoDetect'], (result) => {
    if (result.autoDetect !== false) {
      startMeetingDetection();
    }
  });
}

function setupDragging(widget) {
  const onMouseDown = (e) => {
    const header = e.target.closest('.widget-header');
    if (!header) return;
    isDragging = true;
    const rect = widgetHost.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 60;
    const left = Math.max(0, Math.min(x, maxX));
    const top = Math.max(0, Math.min(y, maxY));
    widgetHost.style.left = left + 'px';
    widgetHost.style.top = top + 'px';
    widgetHost.style.bottom = 'auto';
    widgetHost.style.right = 'auto';
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    const rect = widgetHost.getBoundingClientRect();
    chrome.storage.local.set({
      widgetPos: {
        left: Math.round(rect.left),
        bottom: Math.round(window.innerHeight - rect.bottom),
      },
    });
  };

  widget.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function collapseWidget() {
  isCollapsed = true;
  const widget = shadowRoot.getElementById('copilot-widget');
  widget.className = 'widget collapsed' +
    (mediaRecorder && mediaRecorder.state === 'recording' ? ' recording' : '') +
    (isPaused ? ' paused-state' : '');
  widget.innerHTML = '';
  const icon = document.createElement('div');
  icon.className = 'collapsed-icon';
  icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
  widget.appendChild(icon);
  widget.addEventListener('click', expandWidget, { once: true });
}

function expandWidget() {
  isCollapsed = false;
  const widget = shadowRoot.getElementById('copilot-widget');
  widget.className = 'widget';
  widget.innerHTML = '';
  if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
    showRecordingUI();
  } else {
    showIdleUI();
  }
}

function buildHeader() {
  const header = document.createElement('div');
  header.className = 'widget-header';
  header.innerHTML = `
    <div class="header-logo">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
    </div>
    <span class="header-title">${getPlatformName()}</span>
    <div class="header-actions">
      <button class="header-btn collapse-btn" title="Minimize">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" x2="19" y1="12" y2="12"/></svg>
      </button>
      <button class="header-btn close-btn" title="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  `;
  header.querySelector('.collapse-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    collapseWidget();
  });
  header.querySelector('.close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    stopAllTracks();
    if (timerInterval) clearInterval(timerInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    chrome.runtime.sendMessage({ type: 'recordingStopped', duration: recordingSeconds });
    widgetHost.remove();
    if (meetingDetectObserver) meetingDetectObserver.disconnect();
    pageObserver.disconnect();
  });
  return header;
}

// ── UI States ──

function showIdleUI() {
  const widget = shadowRoot.getElementById('copilot-widget');
  widget.innerHTML = '';
  widget.appendChild(buildHeader());

  const body = document.createElement('div');
  body.className = 'widget-body';

  const hint = document.createElement('div');
  hint.className = 'hint-text';
  hint.textContent = getPlatformHint();
  body.appendChild(hint);

  const recordBtn = document.createElement('button');
  recordBtn.className = 'btn btn-primary';
  recordBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg> Start Recording`;
  recordBtn.addEventListener('click', startRecording);
  body.appendChild(recordBtn);

  const shortcut = document.createElement('div');
  shortcut.className = 'shortcut-hint';
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  shortcut.innerHTML = `<kbd>${isMac ? '⌘' : 'Ctrl'}+Shift+M</kbd> to open app`;
  body.appendChild(shortcut);

  widget.appendChild(body);
}

function showRecordingUI() {
  const widget = shadowRoot.getElementById('copilot-widget');
  widget.innerHTML = '';
  widget.appendChild(buildHeader());

  const body = document.createElement('div');
  body.className = 'widget-body';

  const status = document.createElement('div');
  status.className = 'status-text ' + (isPaused ? 'paused-status' : 'recording-status');
  status.id = 'rec-status';
  status.innerHTML = `<span class="status-dot"></span> ${isPaused ? 'Paused' : 'Recording'}`;
  body.appendChild(status);

  const timer = document.createElement('div');
  timer.className = 'timer' + (isPaused ? ' paused-timer' : '');
  timer.id = 'copilot-timer';
  timer.textContent = formatTime(recordingSeconds);
  body.appendChild(timer);

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const pauseBtn = document.createElement('button');
  pauseBtn.className = isPaused ? 'btn btn-warning' : 'btn btn-secondary';
  pauseBtn.id = 'pause-btn';
  if (isPaused) {
    pauseBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume`;
  } else {
    pauseBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Pause`;
  }
  pauseBtn.addEventListener('click', togglePause);
  btnRow.appendChild(pauseBtn);

  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn btn-danger';
  stopBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Stop`;
  stopBtn.addEventListener('click', stopRecording);
  btnRow.appendChild(stopBtn);

  body.appendChild(btnRow);
  widget.appendChild(body);
}

function showStoppedUI(blob, mimeType) {
  const widget = shadowRoot.getElementById('copilot-widget');
  widget.innerHTML = '';
  widget.appendChild(buildHeader());

  const body = document.createElement('div');
  body.className = 'widget-body';

  const status = document.createElement('div');
  status.className = 'status-text done-status';
  status.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Recording Complete`;
  body.appendChild(status);

  const duration = document.createElement('div');
  duration.className = 'timer';
  duration.style.marginBottom = '12px';
  duration.textContent = formatTime(recordingSeconds);
  body.appendChild(duration);

  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'btn btn-primary';
  analyzeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Analyze with AI`;
  analyzeBtn.addEventListener('click', () => analyzeDirectOrHandoff(blob, mimeType, recordingSeconds));
  body.appendChild(analyzeBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-secondary';
  saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Save Recording`;
  saveBtn.addEventListener('click', () => handoffToApp(blob, mimeType, 'save'));
  body.appendChild(saveBtn);

  const openBtn = document.createElement('button');
  openBtn.className = 'btn btn-ghost';
  openBtn.textContent = 'Open in app';
  openBtn.addEventListener('click', () => handoffToApp(blob, mimeType, null));
  body.appendChild(openBtn);

  widget.appendChild(body);
}

// ── Recording Logic ──

async function startRecording() {
  try {
    const tabStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const audioTracks = tabStream.getAudioTracks();
    if (audioTracks.length === 0) {
      tabStream.getTracks().forEach((t) => t.stop());
      alert('No audio detected. Please check "Share tab audio" when selecting your tab.');
      return;
    }
    tabStream.getVideoTracks().forEach((t) => t.stop());
    streamRef = tabStream;

    // Mic mixing
    const settings = await new Promise((r) => chrome.storage.sync.get(['includeMic', 'recordingQuality'], r));
    const includeMic = settings.includeMic !== false;
    let recordStream = tabStream;

    if (includeMic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef = micStream;
        const ctx = new AudioContext();
        audioCtxRef = ctx;
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(tabStream).connect(dest);
        ctx.createMediaStreamSource(micStream).connect(dest);
        recordStream = dest.stream;
      } catch (micErr) {
        console.warn('Mic access denied, recording tab audio only:', micErr.message);
      }
    }

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : '';
    }
    const bitrate = getQualityBitrate(settings.recordingQuality || 'medium');
    const options = mimeType ? { mimeType, audioBitsPerSecond: bitrate } : { audioBitsPerSecond: bitrate };
    mediaRecorder = new MediaRecorder(recordStream, options);
    audioChunks = [];
    recordingSeconds = 0;
    isPaused = false;

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      stopAllTracks();
      chrome.runtime.sendMessage({ type: 'recordingStopped', duration: recordingSeconds });
      showStoppedUI(blob, mediaRecorder.mimeType || 'audio/webm');
    };

    tabStream.getAudioTracks()[0].addEventListener('ended', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording();
      }
    });

    mediaRecorder.start(1000);
    showRecordingUI();
    chrome.runtime.sendMessage({ type: 'recordingStarted', platform: getPlatformName() });

    timerInterval = setInterval(() => {
      if (!isPaused) {
        recordingSeconds++;
        const timerEl = shadowRoot.getElementById('copilot-timer');
        if (timerEl) timerEl.textContent = formatTime(recordingSeconds);
      }
    }, 1000);

  } catch (err) {
    console.error('Recording failed:', err);
    alert(err.message || 'Failed to start recording. Please allow screen/tab sharing.');
    showIdleUI();
  }
}

function togglePause() {
  if (!mediaRecorder) return;
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    isPaused = true;
    chrome.runtime.sendMessage({ type: 'recordingPaused', elapsed: recordingSeconds });
    showRecordingUI();
    if (isCollapsed) {
      const widget = shadowRoot.getElementById('copilot-widget');
      widget.classList.remove('recording');
      widget.classList.add('paused-state');
    }
  } else if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    isPaused = false;
    chrome.runtime.sendMessage({ type: 'recordingResumed' });
    showRecordingUI();
    if (isCollapsed) {
      const widget = shadowRoot.getElementById('copilot-widget');
      widget.classList.add('recording');
      widget.classList.remove('paused-state');
    }
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ── Handoff ──

function analyzeDirectOrHandoff(blob, mimeType, durationSec) {
  blob.arrayBuffer().then((arrayBuffer) => {
    chrome.runtime.sendMessage({
      type: 'extensionAnalyzeDirectly',
      arrayBuffer,
      mimeType,
      durationSeconds: durationSec || 0,
    }, (response) => {
      if (chrome.runtime.lastError || (response && response.fallback)) {
        handoffToApp(blob, mimeType, 'analyze');
      }
    });
  });
}

function handoffToApp(blob, mimeType, action) {
  blob.arrayBuffer().then((arrayBuffer) => {
    chrome.runtime.sendMessage({
      type: 'extensionAudioToApp',
      arrayBuffer,
      mimeType,
      action: action || 'open',
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Extension handoff error:', chrome.runtime.lastError);
        getAppUrl((appUrl) => window.open(`${appUrl}?start=record`, '_blank'));
      }
    });
  });
}

// ── Auto-Detect Meeting ──

function startMeetingDetection() {
  const host = window.location.hostname;

  function checkMeetingActive() {
    let active = false;
    if (host.includes('meet.google.com')) {
      active = !!document.querySelector('[data-self-name]') ||
               !!document.querySelector('[data-participant-id]') ||
               !!document.querySelector('[jscontroller][data-is-muted]');
    } else if (host.includes('zoom.us')) {
      active = !!document.querySelector('.meeting-app') ||
               !!document.querySelector('#wc-container-right');
    } else if (host.includes('teams.microsoft.com')) {
      active = !!document.querySelector('[data-tid="calling-unified-bar"]') ||
               !!document.querySelector('.calling-controls-section');
    }
    return active;
  }

  meetingDetectObserver = new MutationObserver(() => {
    if (meetingDetected) return;
    if (checkMeetingActive()) {
      meetingDetected = true;
      showMeetingDetectedToast();
    }
  });

  meetingDetectObserver.observe(document.body, { childList: true, subtree: true });

  if (checkMeetingActive()) {
    meetingDetected = true;
    showMeetingDetectedToast();
  }
}

function showMeetingDetectedToast() {
  if (!shadowRoot || !shadowRoot.getElementById('copilot-widget')) return;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') return;
  if (isCollapsed) expandWidget();

  const widget = shadowRoot.getElementById('copilot-widget');
  const body = widget.querySelector('.widget-body');
  if (!body) return;

  const existing = body.querySelector('.toast');
  if (existing) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-text">Meeting detected. Record?</div>
    <div class="toast-actions">
      <button class="toast-btn toast-btn-primary">Record</button>
      <button class="toast-btn toast-btn-dismiss">Later</button>
    </div>
  `;
  toast.querySelector('.toast-btn-primary').addEventListener('click', () => {
    toast.remove();
    startRecording();
  });
  toast.querySelector('.toast-btn-dismiss').addEventListener('click', () => {
    toast.remove();
  });
  body.insertBefore(toast, body.firstChild);
}

// ── Message listener for popup controls ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'pauseRecording') {
    if (mediaRecorder && mediaRecorder.state === 'recording') togglePause();
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === 'resumeRecording') {
    if (mediaRecorder && mediaRecorder.state === 'paused') togglePause();
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === 'stopRecording') {
    stopRecording();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

// ── Init ──

injectWidget();

let debounceTimer = null;
const pageObserver = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!document.getElementById('copilot-widget-host')) injectWidget();
  }, 500);
});
pageObserver.observe(document.body, { childList: true });
