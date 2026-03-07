/**
 * Session recorder using rrweb. Records DOM events when user has consented.
 * Batches events every 30s and sends to backend.
 */

import { record } from '@rrweb/record';

const BATCH_INTERVAL_MS = 30 * 1000;
const MAX_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 min cap

let stopRecord: (() => void) | undefined;
let batchInterval: ReturnType<typeof setInterval> | undefined;
let sessionId: string | null = null;
let sessionStartTime: number = 0;
let eventBuffer: any[] = [];

function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function sendBatch(keepalive = false) {
  if (eventBuffer.length === 0) return;
  const token = localStorage.getItem('token');
  if (!token || !sessionId) return;

  const toSend = [...eventBuffer];
  eventBuffer = [];

  const body = JSON.stringify({
    sessionId,
    events: toSend,
    pageUrl: window.location.href,
    startedAt: new Date(sessionStartTime).toISOString(),
  });

  try {
    const opts: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    };
    if (keepalive) (opts as any).keepalive = true;
    await fetch('/api/sessions/events', opts);
  } catch (err) {
    if (!keepalive) console.warn('Session recorder: failed to send events', err);
    eventBuffer.unshift(...toSend);
  }
}

async function endSession() {
  if (batchInterval) {
    clearInterval(batchInterval);
    batchInterval = undefined;
  }
  await sendBatch();
  if (sessionId) {
    const token = localStorage.getItem('token');
    if (token) {
      const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      try {
        await fetch('/api/sessions/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId, durationSeconds }),
        });
      } catch (_) {}
    }
    sessionId = null;
  }
  if (stopRecord) {
    stopRecord();
    stopRecord = undefined;
  }
}

export function startSessionRecorder(): () => void {
  if (stopRecord) return () => endSession();

  sessionId = generateSessionId();
  sessionStartTime = Date.now();
  eventBuffer = [];

  stopRecord = record({
    emit(event) {
      eventBuffer.push(event);
    },
  });

  batchInterval = setInterval(sendBatch, BATCH_INTERVAL_MS);

  // Cap session at 30 min
  const maxDurationTimer = setTimeout(() => {
    endSession();
  }, MAX_SESSION_DURATION_MS);

  const handleBeforeUnload = () => {
    if (eventBuffer.length > 0) {
      sendBatch(true);
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    clearTimeout(maxDurationTimer);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    endSession();
  };
}

export function stopSessionRecorder(): void {
  endSession();
}
