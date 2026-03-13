import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  Loader2,
  X,
  History,
  Clock,
  Activity,
  Zap,
  CheckSquare,
  ChevronRight,
  Plus,
  Search,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { formatDate } from '../utils/format';
import type { Meeting } from '../types/meeting';

type UserAnalytics = {
  rangeDays: number;
  summary: {
    totalMeetings: number;
    totalSeconds: number;
    avgDurationSeconds: number;
  };
  dailyUsage: { day: string; meetings: number; seconds: number }[];
};

type Usage = {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  limitMinutes: number;
  languageChangesLimit?: number;
  isUnlimited?: boolean;
  softLimitMinutes?: number;
  softLimitSeconds?: number;
  hardLimitMinutes?: number;
  hardLimitSeconds?: number;
  planExpiresAt?: string | null;
};

type User = {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  plan_id?: string;
};

type DashboardViewProps = {
  meetings: Meeting[];
  meetingsLoading: boolean;
  user: User | null;
  usage: Usage | null;
  usageLoading: boolean;
  userAnalytics: UserAnalytics | null;
  userAnalyticsLoading: boolean;
  analyticsDays: number;
  setAnalyticsDays: (d: number) => void;
  meetingsSearch: string;
  setMeetingsSearch: (s: string) => void;
  dismissExtensionBanner: boolean;
  setDismissExtensionBanner: (v: boolean) => void;
  onLoadMeeting: (meeting: Meeting, tab?: 'summary' | 'insights' | 'transcript' | 'actionItems' | 'email') => void;
  onNavigateToHistory: () => void;
  onNavigateToSupport: () => void;
  onNavigateToCheckout?: () => void;
  onStartNewMeeting: () => void;
  onRefresh: () => void;
};

export default function DashboardView({
  meetings,
  meetingsLoading,
  user,
  usage,
  usageLoading,
  userAnalytics,
  userAnalyticsLoading,
  analyticsDays,
  setAnalyticsDays,
  meetingsSearch,
  setMeetingsSearch,
  dismissExtensionBanner,
  setDismissExtensionBanner,
  onLoadMeeting,
  onNavigateToHistory,
  onNavigateToSupport,
  onNavigateToCheckout,
  onStartNewMeeting,
  onRefresh,
}: DashboardViewProps) {
  const { t } = useTranslation();

  const greeting = (() => {
    const h = new Date().getHours();
    const timeKey = h < 12 ? 'greetingMorning' : h < 18 ? 'greetingAfternoon' : 'greetingEvening';
    const name = user?.name?.trim() || t('common.guest');
    return t(`dashboard.${timeKey}`, { name });
  })();

  const dailyUsageWithMinutes = (userAnalytics?.dailyUsage || []).map((d) => ({
    ...d,
    dayShort: d.day ? formatDate(d.day + 'T12:00:00', { month: 'short', day: 'numeric' }) : d.day,
    minutes: Math.round(d.seconds / 60),
  }));

  const statsLoading = usageLoading || userAnalyticsLoading;
  const avgMeetingMin =
    userAnalytics?.summary?.avgDurationSeconds != null
      ? Math.round(userAnalytics.summary.avgDurationSeconds / 60)
      : null;

  const recentMeetings = meetings.slice(0, 5);
  const actionItemsData = recentMeetings.reduce(
    (acc, m) => {
      const items = m.analysis?.actionItems ?? [];
      const incomplete = items.filter((a) => !a.completed).length;
      acc.total += items.length;
      acc.incomplete += incomplete;
      return acc;
    },
    { total: 0, incomplete: 0 }
  );

  const meetingWithMostActionItems = recentMeetings
    .filter((m) => (m.analysis?.actionItems?.length ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.analysis?.actionItems?.filter((ai) => !ai.completed)?.length ?? 0) -
        (a.analysis?.actionItems?.filter((ai) => !ai.completed)?.length ?? 0)
    )[0] ?? recentMeetings.find((m) => (m.analysis?.actionItems?.length ?? 0) > 0) ?? recentMeetings[0];

  const recentMeetingsFiltered = meetingsSearch.trim()
    ? meetings.filter((m) => m.title.toLowerCase().includes(meetingsSearch.toLowerCase()))
    : meetings;
  const recentMeetingsToShow = recentMeetingsFiltered.slice(0, 5);

  const isAdminUnlimited = !!(usage?.isUnlimited || user?.role === 'admin');
  const softLimitMin = usage?.softLimitMinutes ?? usage?.limitMinutes ?? 0;
  const hardLimitMin = usage?.hardLimitMinutes ?? usage?.limitMinutes ?? 0;
  const usedMin = usage ? Math.ceil(usage.usedSeconds / 60) : 0;
  const usagePct = usage && usage.limitMinutes > 0 ? (usedMin / usage.limitMinutes) * 100 : 0;
  const isSoftExceeded = !isAdminUnlimited && usage && softLimitMin > 0 && usedMin >= softLimitMin;
  const isNearLimit = !isAdminUnlimited && usage && usagePct >= 80;
  const isCritical = !isAdminUnlimited && usage && usagePct >= 90;

  const daysUntilExpiry = usage?.planExpiresAt
    ? Math.ceil((new Date(usage.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <section className="space-y-6 animate-in fade-in" aria-labelledby="dashboard-heading">
      {!dismissExtensionBanner && (
        <div
          className="flex items-center justify-between gap-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3"
          role="region"
          aria-label={t('dashboard.extensionBanner')}
        >
          <p className="text-sm text-indigo-800">{t('dashboard.extensionBanner')}</p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/chrome-extension.zip"
              download="chrome-extension.zip"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t('dashboard.getExtension')}
            </a>
            <button
              onClick={() => {
                setDismissExtensionBanner(true);
                localStorage.setItem('dismissExtensionBanner', 'true');
              }}
              className="p-1 text-indigo-500 hover:text-indigo-700 rounded"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="dashboard-heading" className="text-xl font-semibold text-slate-900">{greeting}</h2>
            {(user?.plan_id || user?.role === 'admin') && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                {user?.role === 'admin' ? t('common.admin') : user?.plan_id}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.yourOverview')}</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title={t('dashboard.refreshData')}
          aria-label={t('dashboard.refreshData')}
        >
          <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          {t('dashboard.refresh')}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onStartNewMeeting}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
          aria-label={t('nav.recordMeeting')}
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <span className="font-medium text-slate-900">{t('dashboard.quickRecord')}</span>
            <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.quickRecordDesc')}</p>
          </div>
        </button>
        <button
          onClick={onNavigateToHistory}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
          aria-label={t('nav.meetingHistory')}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="font-medium text-slate-900">{t('dashboard.quickHistory')}</span>
            <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.quickHistoryDesc')}</p>
          </div>
        </button>
        <button
          onClick={onNavigateToSupport}
          className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
          aria-label={t('nav.support')}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-medium text-slate-900">{t('dashboard.quickSupport')}</span>
            <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.quickSupportDesc')}</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        {statsLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-full mb-4 mx-auto" />
              <div className="h-8 bg-slate-200 rounded w-16 mx-auto" />
              <div className="h-4 bg-slate-100 rounded w-24 mx-auto mt-3" />
            </div>
          ))
        ) : (
          <>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in"
              style={{ animationDelay: '50ms' }}
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <History className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{meetings.length}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{t('dashboard.totalMeetings')}</div>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in"
              style={{ animationDelay: '100ms' }}
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{usage ? Math.ceil(usage.usedSeconds / 60) : 0}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{t('dashboard.minutesUsedThisMonth')}</div>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in"
              style={{ animationDelay: '150ms' }}
            >
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {isAdminUnlimited ? t('nav.unlimited') : usage ? usage.limitMinutes : 0}
              </div>
              <div className="text-sm font-medium text-slate-500 mt-1">{t('dashboard.monthlyMinuteLimit')}</div>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in"
              style={{ animationDelay: '200ms' }}
            >
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {isAdminUnlimited ? t('nav.unlimited') : usage ? Math.max(0, Math.ceil(usage.remainingSeconds / 60)) : 0}
              </div>
              <div className="text-sm font-medium text-slate-500 mt-1">{t('dashboard.minutesRemaining')}</div>
            </div>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in"
              style={{ animationDelay: '250ms' }}
            >
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{avgMeetingMin ?? '—'}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{t('dashboard.avgMeetingMin')}</div>
            </div>
          </>
        )}
      </div>

      {actionItemsData.total > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-indigo-600" aria-hidden />
            <span className="text-sm font-medium text-slate-700">
              {actionItemsData.incomplete > 0
                ? t('dashboard.actionItemsIncomplete', {
                    incomplete: actionItemsData.incomplete,
                    total: actionItemsData.total,
                  })
                : t('dashboard.actionItemsFromLast5', { count: actionItemsData.total })}
            </span>
          </div>
          {meetingWithMostActionItems && (
            <button
              onClick={() => onLoadMeeting(meetingWithMostActionItems, 'actionItems')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              aria-label={t('dashboard.view') + ' ' + t('dashboard.actionItemsFromLast5', { count: actionItemsData.total })}
            >
              {t('dashboard.view')}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {usage && !usageLoading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-600">{t('dashboard.monthlyUsage')}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">
                {isAdminUnlimited
                  ? t('nav.unlimited')
                  : t('dashboard.minLabel', {
                      used: Math.ceil(usage.usedSeconds / 60),
                      limit: usage.limitMinutes,
                    })}
              </span>
              {!isAdminUnlimited && onNavigateToCheckout && (
                <button
                  type="button"
                  onClick={onNavigateToCheckout}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {t('dashboard.upgradePlan')}
                </button>
              )}
            </div>
          </div>
          {!isAdminUnlimited && (
            <>
              <div className="relative w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isSoftExceeded
                      ? 'bg-red-500'
                      : isCritical
                        ? 'bg-red-400'
                        : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                  }`}
                  style={{
                    width: `${Math.min(100, usagePct)}%`,
                  }}
                />
                {usage && usage.limitMinutes > 0 && softLimitMin < usage.limitMinutes && (
                  <div
                    className="absolute top-0 h-2 w-0.5 bg-amber-400"
                    style={{ left: `${(softLimitMin / usage.limitMinutes) * 100}%` }}
                    title={`Soft limit: ${softLimitMin} min`}
                  />
                )}
                {usage && usage.limitMinutes > 0 && hardLimitMin > usage.limitMinutes && (
                  <div
                    className="absolute top-0 h-2 w-0.5 bg-red-400"
                    style={{ left: `${Math.min(100, (hardLimitMin / (hardLimitMin * 1.1)) * 100)}%` }}
                    title={`Hard limit: ${hardLimitMin} min`}
                  />
                )}
              </div>
              {isSoftExceeded && usage.remainingSeconds > 0 && (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-amber-600">{t('dashboard.softLimitExceeded', { percent: Math.round(usagePct) })}</p>
                  {onNavigateToCheckout && (
                    <button type="button" onClick={onNavigateToCheckout} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {t('dashboard.upgradePlan')}
                    </button>
                  )}
                </div>
              )}
              {usage.remainingSeconds <= 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-sm text-red-600">{t('nav.reachedLimit')}</p>
                  {onNavigateToCheckout ? (
                    <button type="button" onClick={onNavigateToCheckout} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {t('dashboard.upgradePlan')}
                    </button>
                  ) : (
                    <a href="/#pricing" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {t('dashboard.upgradePlan')}
                    </a>
                  )}
                </div>
              )}
              {usage.remainingSeconds > 0 && !isSoftExceeded && isNearLimit && (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-amber-600">
                    {isCritical ? t('dashboard.criticalUsage', { percent: Math.round(usagePct) }) : t('nav.nearingLimit')}
                  </p>
                  {onNavigateToCheckout ? (
                    <button type="button" onClick={onNavigateToCheckout} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {t('dashboard.upgradePlan')}
                    </button>
                  ) : (
                    <a href="/#pricing" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {t('dashboard.upgradePlan')}
                    </a>
                  )}
                </div>
              )}
            </>
          )}
          {isAdminUnlimited && (
            <div className="mt-1 space-y-1">
              <p className="text-sm text-slate-500">{t('dashboard.adminsUnlimitedRecording')}</p>
              {usage && usage.usedSeconds > 0 && (
                <p className="text-xs text-slate-400">{t('dashboard.adminActualUsage', { minutes: Math.ceil(usage.usedSeconds / 60) })}</p>
              )}
            </div>
          )}
          {!isAdminUnlimited && daysUntilExpiry != null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">{t('dashboard.planExpiresIn', { days: daysUntilExpiry })}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.meetingTrend')}</h3>
            <div className="flex rounded-lg bg-slate-100 p-0.5" role="tablist">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalyticsDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${analyticsDays === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  role="tab"
                  aria-selected={analyticsDays === d}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="h-56">
            {userAnalyticsLoading ? (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                <Loader2 className="w-8 h-8 text-slate-300 animate-spin" aria-hidden />
              </div>
            ) : !dailyUsageWithMinutes.length ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl">
                <History className="w-12 h-12 mb-3 opacity-20" aria-hidden />
                <p className="text-sm">{t('dashboard.noMeetingsYet')}</p>
                <p className="text-xs mt-1">{t('dashboard.startTrends')}</p>
                <button
                  onClick={onStartNewMeeting}
                  className="mt-3 text-indigo-600 font-medium hover:text-indigo-700 text-sm"
                >
                  {t('dashboard.recordMeeting')}
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyUsageWithMinutes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayShort" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, t('dashboard.meetings')]}
                    labelFormatter={(label) => label}
                  />
                  <Line
                    type="monotone"
                    dataKey="meetings"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.minutesByDay')}</h3>
            <span className="text-xs text-slate-500">{t('dashboard.days', { count: analyticsDays })}</span>
          </div>
          <div className="h-56">
            {userAnalyticsLoading ? (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                <Loader2 className="w-8 h-8 text-slate-300 animate-spin" aria-hidden />
              </div>
            ) : !dailyUsageWithMinutes.length ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl">
                <Clock className="w-12 h-12 mb-3 opacity-20" aria-hidden />
                <p className="text-sm">{t('dashboard.noMeetingsYet')}</p>
                <p className="text-xs mt-1">{t('dashboard.startTrends')}</p>
                <button
                  onClick={onStartNewMeeting}
                  className="mt-3 text-indigo-600 font-medium hover:text-indigo-700 text-sm"
                >
                  {t('dashboard.recordMeeting')}
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyUsageWithMinutes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayShort" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [value, t('dashboard.minutes')]}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  <Bar
                    dataKey="minutes"
                    name={t('dashboard.minutes')}
                    fill="#0ea5e9"
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.recentMeetings')}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {meetings.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                <input
                  type="text"
                  placeholder={t('dashboard.searchMeetings')}
                  value={meetingsSearch}
                  onChange={(e) => setMeetingsSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-40 sm:w-48"
                  aria-label={t('dashboard.searchMeetings')}
                />
              </div>
            )}
            <button
              onClick={onNavigateToHistory}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              {t('dashboard.viewAll')}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onStartNewMeeting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              aria-label={t('dashboard.recordNew')}
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.recordNew')}
            </button>
          </div>
        </div>

        {meetingsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" aria-hidden />
            <p className="font-medium text-slate-600">{t('dashboard.noMeetingsRecorded')}</p>
            <p className="text-sm mt-1">{t('dashboard.recordFirstMeeting')}</p>
            <button
              onClick={onStartNewMeeting}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.startFirstRecording')}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {recentMeetingsToShow.map((meeting) => {
                const actionCount = meeting.analysis?.actionItems?.length ?? 0;
                return (
                  <div
                    key={meeting.id}
                    onClick={() => onLoadMeeting(meeting)}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer bg-slate-50 hover:bg-white group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onLoadMeeting(meeting);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {meeting.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(meeting.date)}
                          </span>
                          {meeting.analysis?.sentiment ? (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5" />
                              {meeting.analysis.sentiment}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-400">—</span>
                          )}
                          {actionCount > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-3.5 h-3.5" />
                              {t('history.actionItems', { count: actionCount })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
            {(meetings.length > 5 || (meetingsSearch.trim() && recentMeetingsFiltered.length > 5)) && (
              <button
                onClick={onNavigateToHistory}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                {t('dashboard.viewAllMeetings', {
                  count: meetingsSearch.trim() ? recentMeetingsFiltered.length : meetings.length,
                })}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {meetingsSearch.trim() && recentMeetingsFiltered.length === 0 && meetings.length > 0 && (
              <p className="text-center py-6 text-slate-500 text-sm">{t('dashboard.noMatch', { query: meetingsSearch })}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
