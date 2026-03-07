import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { formatDateTime } from '../../utils/format';
import SessionReplayPlayer from './SessionReplayPlayer';

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  page_url: string | null;
  duration_seconds: number | null;
  email: string | null;
};

export default function AdminSessionsView() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);

  const loadSessions = async (p = page) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      const res = await fetch(`/api/admin/sessions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sessions');
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(1);
  }, [token]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.sessionReplay')}</h2>
          <button
            onClick={() => loadSessions(page)}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            title={t('admin.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="overflow-x-auto">
        {loading && sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">{t('common.loading')}</div>
        ) : (
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-700">{t('admin.user')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('admin.startedAt')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('admin.duration')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('admin.page')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-700">{s.email || s.user_id}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDateTime(s.started_at)}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {s.duration_seconds != null ? `${Math.round(s.duration_seconds / 60)} min` : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={s.page_url || ''}>
                    {s.page_url ? (() => { try { return new URL(s.page_url).pathname; } catch { return s.page_url; } })() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setReplaySessionId(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      {t('admin.replay')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > pageSize && (
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
          <span>
            {t('admin.page')} {page} {t('admin.of')} {Math.ceil(total / pageSize)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => loadSessions(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => loadSessions(page + 1)}
              disabled={page >= Math.ceil(total / pageSize) || loading}
              className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}

      {replaySessionId && (
        <SessionReplayPlayer
          sessionId={replaySessionId}
          onClose={() => setReplaySessionId(null)}
          token={token}
        />
      )}
    </div>
  );
}
