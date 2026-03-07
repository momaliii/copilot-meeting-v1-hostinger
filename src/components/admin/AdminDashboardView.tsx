import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Activity, MessageSquare, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import type { AdminPermissions } from '../../types/admin';

const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-5 h-5 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
    </div>
    <div className="h-9 w-16 bg-slate-200 rounded animate-pulse" />
  </div>
);

const ChartSkeleton = () => (
  <div className="h-64 flex items-center justify-center">
    <div className="w-full h-48 bg-slate-100 rounded-lg animate-pulse flex items-end justify-around gap-2 px-4 pb-2">
      {[45, 65, 40, 80, 55, 70, 50, 60, 75, 45].map((h, i) => (
        <div key={i} className="flex-1 bg-slate-200 rounded-t animate-pulse" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

type Stats = {
  totalUsers: number;
  totalMeetings: number;
  totalMinutes: number;
  pendingFeedback: number;
  mrr: number;
  monthlyCost: number;
  monthlyProfit: number;
  marginPct: number;
  planCostBreakdown: { starterCost: number; proCost: number };
};

type AdminDashboardViewProps = {
  stats: Stats;
  analytics: any;
  sectionLoading: { stats: boolean; analytics: boolean };
  systemStatus: { db: string; checks: { geminiConfigured: boolean; jwtConfigured: boolean } } | null;
  formatCurrency: (n: number) => string;
  analyticsDays: number;
  setAnalyticsDays: (d: number) => void;
  currentPermissions: AdminPermissions;
  onRefresh: () => void;
  onNavigateToFeedback: () => void;
  onNavigateToSupport: () => void;
};

export default function AdminDashboardView({
  stats,
  analytics,
  sectionLoading,
  systemStatus,
  formatCurrency,
  analyticsDays,
  setAnalyticsDays,
  currentPermissions,
  onRefresh,
  onNavigateToFeedback,
  onNavigateToSupport,
}: AdminDashboardViewProps) {
  const { t } = useTranslation();
  return (
    <section className="space-y-6" aria-labelledby="admin-dashboard-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="admin-dashboard-heading" className="text-lg font-semibold text-slate-800">
          {t('admin.overview')}
        </h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          aria-label="Refresh dashboard data"
        >
          {t('admin.refresh')}
        </button>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {stats.pendingFeedback > 0 && (
          <button
            onClick={onNavigateToFeedback}
            className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            {stats.pendingFeedback} {t('admin.pendingFeedback')}
          </button>
        )}
        {currentPermissions.manageSupport && (
          <button
            onClick={onNavigateToSupport}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {t('admin.support')}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {sectionLoading.stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all" aria-label="Total users">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <Users className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.totalUsers')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats.totalUsers}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all" aria-label="Total meetings">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <Activity className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.totalMeetings')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats.totalMeetings}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all" aria-label="Minutes processed">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <Activity className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.minutesProcessed')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats.totalMinutes}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all" aria-label="Pending moderation">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.pendingFeedback')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats.pendingFeedback}</div>
              {analytics?.moderationOverview && !sectionLoading.analytics && (
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-amber-600">{analytics.moderationOverview.pending ?? 0} pending</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-600">{analytics.moderationOverview.accepted ?? 0} accepted</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{analytics.moderationOverview.rejected ?? 0} rejected</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {sectionLoading.stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.monthlyRevenue')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.mrr)}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <TrendingDown className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.estimatedMonthlyCost')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.monthlyCost)}</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.estimatedProfit')}</h3>
              </div>
              <div className={`text-3xl font-bold ${stats.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(stats.monthlyProfit)}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <Activity className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.profitMargin')}</h3>
              </div>
              <div className={`text-3xl font-bold ${stats.marginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {`${stats.marginPct}%`}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sectionLoading.stats ? (
          Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <TrendingDown className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.starterPlanCost')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.planCostBreakdown?.starterCost || 0)}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <TrendingDown className="w-5 h-5" />
                <h3 className="font-medium">{t('admin.proPlanCost')}</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(stats.planCostBreakdown?.proCost || 0)}
              </div>
            </div>
          </>
        )}
      </div>

      {currentPermissions.viewAnalytics && systemStatus && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('admin.systemStatus')}</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.db === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-600">{t('admin.db')}: {systemStatus.db}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.checks?.geminiConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm text-slate-600">Gemini: {systemStatus.checks?.geminiConfigured ? t('admin.geminiConfigured') : t('admin.geminiNotSet')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.checks?.jwtConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm text-slate-600">JWT: {systemStatus.checks?.jwtConfigured ? t('admin.jwtConfigured') : t('admin.jwtDefault')}</span>
            </div>
          </div>
        </div>
      )}

      {currentPermissions.viewAnalytics && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-slate-600">{t('admin.analyticsRange')}:</span>
            <div className="flex gap-1">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalyticsDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${analyticsDays === d ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {d} {t('admin.days')}
                </button>
              ))}
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('admin.meetingTrend')}</h3>
              {sectionLoading.analytics ? (
                <ChartSkeleton />
              ) : (analytics?.meetingsByDay?.length ?? 0) > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.meetingsByDay || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">{t('admin.noMeetingData')}</div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('admin.revenueVsCost')}</h3>
              {sectionLoading.analytics ? (
                <ChartSkeleton />
              ) : (analytics?.financeTimeline?.length ?? 0) > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.financeTimeline || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">{t('admin.noFinanceData')}</div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('admin.planDistribution')}</h3>
            {sectionLoading.analytics ? (
              <ChartSkeleton />
            ) : (analytics?.planDistribution?.length ?? 0) > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.planDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="planId" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">{t('admin.noPlanDistributionData')}</div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
