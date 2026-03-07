// Runs on the Meeting Copilot app page - receives blob from extension and dispatches to React

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'extensionAudio') {
    const { arrayBuffer, mimeType, action } = message;
    if (!arrayBuffer) {
      sendResponse({ ok: false, error: 'No audio data' });
      return true;
    }
    const blob = new Blob([arrayBuffer], { type: mimeType || 'audio/webm' });
    window.dispatchEvent(new CustomEvent('meetingCopilotExtensionAudio', {
      detail: { blob, action: action || 'open' },
    }));
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === 'extensionAnalyzed') {
    const { arrayBuffer, mimeType, analysis, durationSeconds } = message;
    if (!arrayBuffer || !analysis) {
      sendResponse({ ok: false, error: 'Missing audio or analysis' });
      return true;
    }
    const blob = new Blob([arrayBuffer], { type: mimeType || 'audio/webm' });
    window.dispatchEvent(new CustomEvent('meetingCopilotExtensionAnalyzed', {
      detail: { blob, analysis, durationSeconds: durationSeconds || 0 },
    }));
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === 'getToken') {
    const token = localStorage.getItem('token');
    sendResponse({ token });
    return true;
  }
  return false;
});
