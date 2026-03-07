import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, RefreshCw, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

type TourEventsData = {
  rangeDays: number;
  total: number;
  completed: number;
  skipped: number;
  completionRate: number;
  skipRate: number;
  byStepIndex: { event_type: string; step_index: number | null; count: number }[];
  byDay: { day: string; event_type: string; count: number }[];
};

const STEP_LABELS: Record<number, string> = {
  0: 'Recording source',
  1: 'Mic only',
  2: 'Tab only',
  3: 'Record',
  4: 'Upload',
  5: 'Test mic',
  6: 'Dashboard',
  7: 'Record Meeting',
  8: 'Meeting History',
  9: 'Support',
  10: 'Monthly usage',
  11: 'User menu',
};

export default function AdminTourView() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [data, setData] = useState<TourEventsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const loadTourEvents = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tour-events?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load tour events');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTourEvents();
  }, [token, days]);

  const byDayChartData = data?.byDay
    ? Object.entries(
        data.byDay.reduce<Record<string, { day: string; completed: number; skipped: number }>>((acc, row) => {
          if (!acc[row.day]) acc[row.day] = { day: row.day, completed: 0, skipped: 0 };
          if (row.event_type === 'completed') acc[row.day].completed += Number(row.count);
          else acc[row.day].skipped += Number(row.count);
          return acc;
        }, {})
      ).map(([, v]) => v)
    : [];

  const stepFunnel = data?.byStepIndex
    ? Object.entries(
        data.byStepIndex.reduce<Record<number, { completed: number; skipped: number }>>((acc, row) => {
          const idx = row.step_index ?? -1;
          if (!acc[idx]) acc[idx] = { completed: 0, skipped: 0 };
          if (row.event_type === 'completed') acc[idx].completed += Number(row.count);
          else acc[idx].skipped += Number(row.count);
          return acc;
        }, {})
      )
      .filter(([k]) => Number(k) >= 0)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([stepIdx, counts]: [string, { completed: number; skipped: number }]) => ({
        step: Number(stepIdx) + 1,
        label: STEP_LABELS[Number(stepIdx)] ?? `Step ${Number(stepIdx) + 1}`,
        completed: counts.completed,
        skipped: counts.skipped,
      }))
    : [];

  return (
    <section className="space-y-6" aria-labelledby="admin-tour-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="admin-tour-heading" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-600" />
          {t('admin.tourAnalytics')}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value={7}>7 {t('admin.days')}</option>
            <option value={14}>14 {t('admin.days')}</option>
            <option value={30}>30 {t('admin.days')}</option>
            <option value={90}>90 {t('admin.days')}</option>
          </select>
          <button
            onClick={loadTourEvents}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          {t('common.loading')}
        </div>
      ) : data ? (
        <>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.tourTotal')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{data.total}</div>
              <p className="text-xs text-slate-500 mt-1">{t('admin.tourTotalDesc')}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.tourCompleted')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{data.completed}</div>
              <p className="text-xs text-slate-500 mt-1">{data.completionRate}% {t('admin.tourOfTotal')}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-amber-600">
                <XCircle className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.tourSkipped')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{data.skipped}</div>
              <p className="text-xs text-slate-500 mt-1">{data.skipRate}% {t('admin.tourOfTotal')}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-indigo-600">
                <Compass className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.tourCompletionRate')}</h3>
              </div>
              <div className="text-3xl font-bold text-indigo-600">{data.completionRate}%</div>
              <p className="text-xs text-slate-500 mt-1">{t('admin.tourCompletionRateDesc')}</p>
            </div>
          </div>

          {byDayChartData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-medium text-slate-800 mb-4">{t('admin.tourByDay')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDayChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name={t('admin.tourCompleted')} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="skipped" name={t('admin.tourSkipped')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stepFunnel.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-medium text-slate-800 mb-4">{t('admin.tourStepFunnel')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-start py-3 font-medium text-slate-700">{t('admin.tourStep')}</th>
                      <th className="text-start py-3 font-medium text-slate-700">{t('admin.tourStepLabel')}</th>
                      <th className="text-end py-3 font-medium text-slate-700">{t('admin.tourCompleted')}</th>
                      <th className="text-end py-3 font-medium text-slate-700">{t('admin.tourSkipped')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepFunnel.map((row) => (
                      <tr key={row.step} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 text-slate-600">{row.step}</td>
                        <td className="py-3 text-slate-700">{row.label}</td>
                        <td className="py-3 text-end text-emerald-600">{row.completed}</td>
                        <td className="py-3 text-end text-amber-600">{row.skipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.total === 0 && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
              {t('admin.tourNoData')}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
