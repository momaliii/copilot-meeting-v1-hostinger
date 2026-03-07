import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Replayer } from '@rrweb/replay';
import { X, Play, Pause } from 'lucide-react';
import '@rrweb/replay/dist/style.css';

type SessionReplayPlayerProps = {
  sessionId: string;
  onClose: () => void;
  token: string | null;
};

export default function SessionReplayPlayer({ sessionId, onClose, token }: SessionReplayPlayerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!token || !sessionId) return;

    let replayer: Replayer | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Failed to load session');
        const events = data.events || [];
        if (events.length === 0) {
          setError(t('admin.noReplayData'));
          setLoading(false);
          return;
        }
        setLoading(false);
        // Container is always rendered (below) so ref is available; use rAF to ensure DOM is ready
        requestAnimationFrame(() => {
          if (cancelled || !containerRef.current) return;
          replayer = new Replayer(events, {
            root: containerRef.current,
            showWarning: false,
          });
          replayerRef.current = replayer;
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      replayer?.destroy();
      replayerRef.current = null;
    };
  }, [sessionId, token, t]);

  const togglePlay = () => {
    const r = replayerRef.current;
    if (!r) return;
    if (playing) {
      r.pause();
    } else {
      r.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.sessionReplay')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              disabled={loading || !!error}
              className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4 bg-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10 text-slate-500">{t('common.loading')}</div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10 text-red-600">{error}</div>
          )}
          <div ref={containerRef} className="rr-block" style={{ minHeight: 400, visibility: loading || error ? 'hidden' : 'visible' }} />
        </div>
      </div>
    </div>
  );
}
