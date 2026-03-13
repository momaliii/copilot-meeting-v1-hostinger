import React from 'react';
import {
  Mic,
  Activity,
  History,
  MessageCircle,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
  X,
  AlertTriangle,
} from 'lucide-react';
import type { TFunction } from 'i18next';

export type UserSidebarView = 'dashboard' | 'record' | 'history' | 'support' | 'profile';

type Usage = {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  limitMinutes: number;
  languageChangesLimit?: number;
};

type User = {
  id?: string;
  role?: string;
  name?: string;
  email?: string;
  plan_id?: string;
};

type UserSidebarProps = {
  isVisible: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  activeView: UserSidebarView;
  onNavigate: (view: UserSidebarView) => void;
  usage: Usage | null;
  user: User | null;
  adminViewMode?: 'admin' | 'user';
  onBackToAdmin?: () => void;
  t: TFunction;
};

export default function UserSidebar({
  isVisible,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  activeView,
  onNavigate,
  usage,
  user,
  adminViewMode,
  onBackToAdmin,
  t,
}: UserSidebarProps) {
  const isDashboard = activeView === 'dashboard';
  const isRecord = activeView === 'record';
  const isHistory = activeView === 'history';
  const isSupport = activeView === 'support';

  const navItemClass = (active: boolean) =>
    `w-full text-start px-3 py-2.5 rounded-xl text-sm font-medium flex items-center ${
      isCollapsed ? 'md:justify-center md:px-2' : 'gap-2'
    } ${active ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`;

  const hiddenWhenCollapsed = isCollapsed ? 'md:hidden' : '';

  return (
    <aside
      className={`fixed inset-y-0 start-0 z-30 w-72 border-e border-slate-200 bg-white shadow-lg transform transition-transform duration-300 ease-out flex flex-col ${
        isCollapsed ? 'md:w-20' : 'md:w-72'
      } ${isVisible ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'} md:translate-x-0`}
    >
      <div className="h-16 px-4 border-b border-slate-200 flex items-center gap-2 shrink-0">
        <div className="bg-indigo-600 p-1.5 rounded-lg flex-shrink-0">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <div className={`flex-1 min-w-0 ${hiddenWhenCollapsed}`}>
          <h1 className="font-semibold tracking-tight text-slate-900 truncate">Meeting Copilot</h1>
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          title={t('admin.collapseSidebar')}
          aria-label={t('admin.collapseSidebar')}
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          title={isCollapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
          aria-label={isCollapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`tour-dashboard ${navItemClass(isDashboard)}`}
          title={t('nav.dashboard')}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span className={hiddenWhenCollapsed}>{t('nav.dashboard')}</span>
        </button>

        <button
          onClick={() => onNavigate('record')}
          className={`tour-new-meeting ${navItemClass(isRecord)}`}
          title={t('nav.recordMeeting')}
        >
          <Mic className="w-4 h-4 shrink-0" />
          <span className={hiddenWhenCollapsed}>{t('nav.recordMeeting')}</span>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className={`tour-history ${navItemClass(isHistory)}`}
          title={t('nav.meetingHistory')}
        >
          <History className="w-4 h-4 shrink-0" />
          <span className={hiddenWhenCollapsed}>{t('nav.meetingHistory')}</span>
        </button>

        <button
          onClick={() => onNavigate('support')}
          className={`tour-support ${navItemClass(isSupport)}`}
          title={t('nav.support')}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className={hiddenWhenCollapsed}>{t('nav.support')}</span>
        </button>

        {user?.role === 'admin' && adminViewMode === 'user' && onBackToAdmin && (
          <button
            onClick={onBackToAdmin}
            className={`w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl font-medium transition-colors border border-indigo-200 text-sm ${isCollapsed ? 'md:px-2' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className={hiddenWhenCollapsed}>{t('nav.backToAdmin')}</span>
          </button>
        )}

        {usage && (
          <div className={`tour-monthly-usage mt-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 ${hiddenWhenCollapsed}`}>
            <div className="flex justify-between mb-1">
              <span className="flex items-center gap-1">
                {t('nav.monthlyUsage')}
                {!((usage as any).isUnlimited || user?.role === 'admin') &&
                  usage.remainingSeconds > 0 &&
                  usage.usedSeconds / 60 >= usage.limitMinutes * 0.8 && (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  )}
              </span>
              <span className="font-medium text-slate-700">
                {(usage as any).isUnlimited || user?.role === 'admin'
                  ? t('nav.unlimited')
                  : t('nav.minUsed', { used: Math.ceil(usage.usedSeconds / 60), limit: usage.limitMinutes })}
              </span>
            </div>
            {!((usage as any).isUnlimited || user?.role === 'admin') && (
              <>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      usage.usedSeconds / 60 >= usage.limitMinutes
                        ? 'bg-red-500'
                        : usage.usedSeconds / 60 >= usage.limitMinutes * 0.8
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (usage.usedSeconds / 60 / usage.limitMinutes) * 100)}%`,
                    }}
                  />
                </div>
                {usage.remainingSeconds <= 0 && (
                  <p className="mt-2 text-red-600">{t('nav.reachedLimit')}</p>
                )}
                {usage.remainingSeconds > 0 &&
                  usage.remainingSeconds <= Math.floor(usage.limitSeconds * 0.2) && (
                    <p className="mt-2 text-amber-600">{t('nav.nearingLimit')}</p>
                  )}
              </>
            )}
            {((usage as any).isUnlimited || user?.role === 'admin') && (
              <div>
                <p className="mt-1 text-slate-500">{t('nav.adminsUnlimited')}</p>
                {usage.usedSeconds > 0 && (
                  <p className="mt-0.5 text-slate-400">{Math.ceil(usage.usedSeconds / 60)} min used this month</p>
                )}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
