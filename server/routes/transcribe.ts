/**
 * Server-side streaming STT via Deepgram WebSocket.
 * When DEEPGRAM_API_KEY is set, provides higher-quality live transcription.
 * Client falls back to Web Speech API when unavailable.
 */
import { WebSocketServer } from 'ws';
import { DeepgramClient } from '@deepgram/sdk';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY?.trim();

export function isTranscribeAvailable(): boolean {
  return !!DEEPGRAM_API_KEY;
}

export function createTranscribeWebSocketServer(server: import('http').Server): void {
  if (!DEEPGRAM_API_KEY) return;

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname !== '/api/transcribe/stream') return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (clientWs, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const language = url.searchParams.get('language') || 'en';
    const sampleRate = parseInt(url.searchParams.get('sample_rate') || '48000', 10) || 48000;
    const bcp47 = mapOutputLanguageToBCP47(language);

    let dgSocket: Awaited<ReturnType<InstanceType<typeof DeepgramClient>['listen']['v1']['connect']>> | null = null;

    try {
      const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY! });
      dgSocket = await deepgram.listen.v1.connect({
        model: 'nova-2',
        language: bcp47 || undefined,
        interim_results: 'true',
        punctuate: 'true',
        encoding: 'linear16',
        sample_rate: sampleRate,
        channels: 1,
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
      });

      dgSocket.on('message', (data: unknown) => {
        try {
          const d = data as { type?: string; channel?: { alternatives?: { transcript?: string }[] }; is_final?: boolean; speech_final?: boolean };
          if (d?.type === 'Results' && d.channel?.alternatives?.[0]) {
            const transcript = d.channel.alternatives[0].transcript;
            const isFinal = d.is_final ?? d.speech_final ?? false;
            if (transcript && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ transcript: transcript.trim(), isFinal }));
            }
          }
        } catch (_) {}
      });

      dgSocket.on('error', (err: Error) => {
        console.warn('[Transcribe] Deepgram error:', err);
        if (clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ error: 'Transcription error' }));
        }
      });

      dgSocket.on('close', () => {
        try { clientWs.close(); } catch (_) {}
      });

      clientWs.on('message', (data: Buffer | ArrayBuffer) => {
        if (dgSocket && dgSocket.readyState === 1) {
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
          dgSocket.sendMedia(buf);
        }
      });

      clientWs.on('close', () => {
        try { dgSocket?.close(); } catch (_) {}
      });
    } catch (err) {
      console.warn('[Transcribe] Failed to connect to Deepgram:', err);
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ error: 'Failed to start transcription' }));
        clientWs.close();
      }
    }
  });
}

function mapOutputLanguageToBCP47(lang: string): string | null {
  const map: Record<string, string> = {
    'Original Language': '',
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Dutch': 'nl',
    'Russian': 'ru',
    'Japanese': 'ja',
    'Chinese (Simplified)': 'zh',
    'Korean': 'ko',
    'Arabic': 'ar',
    'Saudi Arabic': 'ar',
    'Hindi': 'hi',
  };
  const code = map[lang] ?? (lang.length === 2 ? lang : null);
  return code || null;
}
