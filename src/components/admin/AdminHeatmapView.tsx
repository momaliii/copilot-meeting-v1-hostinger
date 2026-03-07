import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Flame } from 'lucide-react';
import { useAuth } from '../../AuthContext';

type HeatmapPoint = { x: number; y: number; type: string; total: number };

export default function AdminHeatmapView() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [pagePath, setPagePath] = useState('/dashboard');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState<'all' | 'click' | 'scroll'>('click');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPages = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/heatmaps/pages', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (res.ok && d.pages?.length) {
        setPages(d.pages);
        if (!d.pages.includes(pagePath)) setPagePath(d.pages[0] || '/dashboard');
      }
    } catch (_) {}
  };

  const loadHeatmap = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        pagePath,
        fromDate,
        toDate,
        ...(typeFilter !== 'all' && { type: typeFilter }),
      });
      const res = await fetch(`/api/admin/heatmaps?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to load heatmap');
      setData(d.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [token]);

  useEffect(() => {
    loadHeatmap();
  }, [token, pagePath, fromDate, toDate, typeFilter]);

  const maxCount = Math.max(1, ...data.map((p) => Number(p.total) || 0));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.heatmaps')}</h2>
          <button
            onClick={() => loadHeatmap()}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            title={t('admin.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={pagePath}
            onChange={(e) => setPagePath(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {pages.length ? pages.map((p) => <option key={p} value={p}>{p}</option>) : <option value="/dashboard">/dashboard</option>}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'click' | 'scroll')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="all">{t('admin.allTypes')}</option>
            <option value="click">{t('admin.clicks')}</option>
            <option value="scroll">{t('admin.scrolls')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="p-6">
        {loading && data.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-slate-500">{t('common.loading')}</div>
        ) : data.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center gap-2 text-slate-500">
            <span>{t('admin.noHeatmapData')}</span>
            {pages.length === 0 && (
              <span className="text-sm text-slate-400">{t('admin.heatmapHint')}</span>
            )}
          </div>
        ) : (
          <div className="relative w-full bg-slate-100 rounded-xl overflow-hidden" style={{ aspectRatio: '16/10', maxHeight: 500 }}>
            <svg className="w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
              {data.map((p, i) => {
                const intensity = Math.min(1, Number(p.total) / maxCount);
                const r = 15 + intensity * 25;
                const opacity = 0.3 + intensity * 0.6;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={p.type === 'click' ? 'rgba(99, 102, 241, ' + opacity + ')' : 'rgba(34, 197, 94, ' + opacity + ')'}
                  />
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
