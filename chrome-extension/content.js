// This script runs on Google Meet, Zoom, and Teams pages

function getPlatformHint() {
  const host = window.location.hostname;
  if (host.includes('meet.google.com')) return 'For best results, choose "Share tab" and check "Share tab audio" when recording.';
  if (host.includes('zoom.us')) return 'For best results, share your screen and enable "Share computer sound" when recording.';
  if (host.includes('teams.microsoft.com')) return 'For best results, share your screen and include system audio when recording.';
  return 'For best results, share tab audio when you share your screen.';
}

const baseStyles = {
  container: 'position:fixed;bottom:24px;left:24px;z-index:999999;display:flex;flex-direction:column;gap:8px;align-items:flex-start;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  btn: 'display:flex;align-items:center;padding:10px 16px;background-color:#4f46e5;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;font-weight:600;font-size:13px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);transition:all 0.2s;',
  btnSecondary: 'background-color:white;color:#334155;border:1px solid #e2e8f0;',
  btnDanger: 'background-color:#dc2626;',
};

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let mediaRecorder = null;
let audioChunks = [];
let streamRef = null;
let timerInterval = null;
let recordingSeconds = 0;

function stopAllTracks() {
  if (streamRef) {
    streamRef.getTracks().forEach(t => t.stop());
    streamRef = null;
  }
}

function injectRecordButton() {
  if (document.getElementById('copilot-record-container')) return;

  const container = document.createElement('div');
  container.id = 'copilot-record-container';
  container.style.cssText = baseStyles.container;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:white;border:none;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.1);';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    stopAllTracks();
    if (timerInterval) clearInterval(timerInterval);
    container.remove();
    observer.disconnect();
  };

  const hint = document.createElement('div');
  hint.textContent = getPlatformHint();
  hint.style.cssText = 'font-size:11px;color:#64748b;max-width:220px;line-height:1.4;opacity:0;transition:opacity 0.2s;margin-top:4px;';

  container.onmouseover = () => { closeBtn.style.opacity = '1'; hint.style.opacity = '1'; };
  container.onmouseout = () => { closeBtn.style.opacity = '0'; hint.style.opacity = '0'; };

  function showIdleUI() {
    inner.innerHTML = '';
    const btn = document.createElement('button');
    btn.id = 'copilot-record-btn';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> Start Record`;
    btn.style.cssText = baseStyles.btn;
    btn.onmouseover = () => { btn.style.backgroundColor = '#4338ca'; btn.style.transform = 'translateY(-1px)'; };
    btn.onmouseout = () => { btn.style.backgroundColor = '#4f46e5'; btn.style.transform = 'translateY(0)'; };
    btn.onclick = startRecording;
    inner.appendChild(btn);
  }

  function showRecordingUI() {
    inner.innerHTML = '';
    const timer = document.createElement('div');
    timer.id = 'copilot-timer';
    timer.style.cssText = 'font-mono font-semibold text-red-600 text-lg';
    timer.textContent = '0:00';

    const stopBtn = document.createElement('button');
    stopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:6px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Stop`;
    stopBtn.style.cssText = baseStyles.btn + baseStyles.btnDanger;
    stopBtn.onmouseover = () => { stopBtn.style.backgroundColor = '#b91c1c'; };
    stopBtn.onmouseout = () => { stopBtn.style.backgroundColor = '#dc2626'; };
    stopBtn.onclick = stopRecording;

    inner.appendChild(timer);
    inner.appendChild(stopBtn);
  }

  function showStoppedUI(blob, mimeType) {
    inner.innerHTML = '';
    const done = document.createElement('div');
    done.style.cssText = 'font-size:13px;color:#16a34a;font-weight:600;margin-bottom:4px;';
    done.textContent = 'Recording complete';

    const analyzeBtn = document.createElement('button');
    analyzeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Analyze`;
    analyzeBtn.style.cssText = baseStyles.btn;
    analyzeBtn.onmouseover = () => { analyzeBtn.style.backgroundColor = '#4338ca'; };
    analyzeBtn.onmouseout = () => { analyzeBtn.style.backgroundColor = '#4f46e5'; };
    analyzeBtn.onclick = () => analyzeDirectOrHandoff(blob, mimeType, recordingSeconds);

    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save`;
    saveBtn.style.cssText = baseStyles.btn + baseStyles.btnSecondary;
    saveBtn.onmouseover = () => { saveBtn.style.backgroundColor = '#f8fafc'; };
    saveBtn.onmouseout = () => { saveBtn.style.backgroundColor = 'white'; };
    saveBtn.onclick = () => handoffToApp(blob, mimeType, 'save');

    const openAppBtn = document.createElement('button');
    openAppBtn.textContent = 'Open in app';
    openAppBtn.style.cssText = 'font-size:12px;color:#64748b;background:none;border:none;cursor:pointer;padding:4px 0;';
    openAppBtn.onclick = () => handoffToApp(blob, mimeType, null);

    inner.appendChild(done);
    inner.appendChild(analyzeBtn);
    inner.appendChild(saveBtn);
    inner.appendChild(openAppBtn);
  }

  async function startRecording() {
    try {
      const tabStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = tabStream.getAudioTracks();
      if (audioTracks.length === 0) {
        tabStream.getTracks().forEach(t => t.stop());
        alert('No audio detected. Please check "Share tab audio" when selecting your tab.');
        return;
      }
      tabStream.getVideoTracks().forEach(t => t.stop());
      streamRef = tabStream;

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : '';
      }
      const options = mimeType ? { mimeType } : undefined;
      mediaRecorder = new MediaRecorder(tabStream, options);
      audioChunks = [];
      recordingSeconds = 0;

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        stopAllTracks();
        showStoppedUI(blob, mediaRecorder.mimeType || 'audio/webm');
      };

      mediaRecorder.start(1000);
      showRecordingUI();

      const timerEl = document.getElementById('copilot-timer');
      timerInterval = setInterval(() => {
        recordingSeconds++;
        if (timerEl) timerEl.textContent = formatTime(recordingSeconds);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
      alert(err.message || 'Failed to start recording. Please allow screen/tab sharing.');
      showIdleUI();
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

  const inner = document.createElement('div');
  inner.style.display = 'flex';
  inner.style.flexDirection = 'column';
  inner.style.gap = '8px';
  showIdleUI();

  container.appendChild(inner);
  container.appendChild(hint);
  container.appendChild(closeBtn);
  document.body.appendChild(container);
}

injectRecordButton();

let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!document.getElementById('copilot-record-container')) injectRecordButton();
  }, 500);
});
observer.observe(document.body, { childList: true });
