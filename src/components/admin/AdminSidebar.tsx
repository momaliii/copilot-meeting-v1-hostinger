import React from 'react';
import {
  Settings,
  CreditCard,
  Users,
  MessageSquare,
  ScrollText,
  Megaphone,
  MessageCircle,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
  Link2,
  Tag,
  Mail,
  PlayCircle,
  Flame,
  Compass,
  Shield,
  Monitor,
  Palette,
} from 'lucide-react';
import type { AdminPage, AdminPermissions } from '../../types/admin';
import type { TFunction } from 'i18next';
import { useBranding } from '../../contexts/BrandingContext';

type AdminSidebarProps = {
  isVisible: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  stats: { totalUsers: number; pendingFeedback: number };
  permissions: AdminPermissions;
  t: TFunction;
};

export default function AdminSidebar({
  isVisible,
  isCollapsed,
  onToggleCollapse,
  activePage,
  onNavigate,
  stats,
  permissions,
  t,
}: AdminSidebarProps) {
  const { siteName } = useBranding();
  const navItemClass = (page: AdminPage) =>
    `w-full text-start px-3 py-2.5 rounded-xl text-sm font-medium flex items-center ${
      isCollapsed ? 'md:justify-center md:px-2' : 'gap-2'
    } ${activePage === page ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`;

  const hiddenWhenCollapsed = isCollapsed ? 'md:hidden' : '';

  return (
    <aside
      className={`fixed inset-y-0 start-0 z-30 w-64 border-e border-slate-200 bg-white shadow-lg transform transition-transform duration-300 ease-out ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      } ${isVisible ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'} md:translate-x-0`}
    >
      <div className="h-16 px-4 border-b border-slate-200 flex items-center gap-2">
        <div className="bg-slate-900 p-1.5 rounded-lg flex-shrink-0">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div className={`flex-1 min-w-0 ${hiddenWhenCollapsed}`}>
          <p className="font-semibold text-slate-900 truncate">{t('admin.adminPanel')}</p>
          <p className="text-xs text-slate-500 truncate">{t('admin.meetingCopilot', { siteName })}</p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          title={isCollapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
          aria-label={isCollapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>
      <nav className="p-3 space-y-1">
        <button onClick={() => onNavigate('dashboard')} className={navItemClass('dashboard')} title={t('admin.dashboard')}>
          <LayoutDashboard className="w-4 h-4" />
          <span className={hiddenWhenCollapsed}>{t('admin.dashboard')}</span>
        </button>
        {permissions.viewAnalytics && (
          <button onClick={() => onNavigate('status')} className={navItemClass('status')} title={t('admin.systemStatusPage', 'System Status')}>
            <Monitor className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.systemStatusPage', 'System Status')}</span>
          </button>
        )}
        <button onClick={() => onNavigate('plans')} className={navItemClass('plans')} title={t('admin.managePlans')}>
          <CreditCard className="w-4 h-4" />
          <span className={hiddenWhenCollapsed}>{t('admin.managePlans')}</span>
        </button>
        <button onClick={() => onNavigate('users')} className={navItemClass('users')} title={t('admin.manageUsers')}>
          <Users className="w-4 h-4" />
          <span className={hiddenWhenCollapsed}>{t('admin.manageUsers')}</span>
          <span className={`ms-auto text-xs px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 ${hiddenWhenCollapsed}`}>
            {stats.totalUsers}
          </span>
        </button>
        <button onClick={() => onNavigate('feedback')} className={navItemClass('feedback')} title={t('admin.userFeedback')}>
          <MessageSquare className="w-4 h-4" />
          <span className={hiddenWhenCollapsed}>{t('admin.userFeedback')}</span>
          <span
            className={`ms-auto text-xs px-2 py-0.5 rounded-full border ${
              stats.pendingFeedback > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-100 text-slate-700'
            } ${hiddenWhenCollapsed}`}
          >
            {stats.pendingFeedback}
          </span>
        </button>
        {permissions.viewAuditLogs && (
          <button onClick={() => onNavigate('audit')} className={navItemClass('audit')} title={t('admin.auditLogs')}>
            <ScrollText className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.auditLogs')}</span>
          </button>
        )}
        {permissions.viewAuditLogs && (
          <button onClick={() => onNavigate('security')} className={navItemClass('security')} title={t('admin.security')}>
            <Shield className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.security')}</span>
          </button>
        )}
        {permissions.manageUsers && (
          <button onClick={() => onNavigate('announcements')} className={navItemClass('announcements')} title={t('admin.announcements')}>
            <Megaphone className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.announcements')}</span>
          </button>
        )}
        {permissions.manageRedirects && (
          <button onClick={() => onNavigate('redirects')} className={navItemClass('redirects')} title={t('admin.redirects')}>
            <Link2 className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.redirects')}</span>
          </button>
        )}
        {permissions.managePromoCodes && (
          <button onClick={() => onNavigate('promos')} className={navItemClass('promos')} title={t('admin.promoCodes')}>
            <Tag className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.promoCodes')}</span>
          </button>
        )}
        {permissions.viewAnalytics && (
          <button onClick={() => onNavigate('tour')} className={navItemClass('tour')} title={t('admin.tourAnalytics')}>
            <Compass className="w-4 h-4" />
            <span className={hiddenWhenCollapsed}>{t('admin.tourAnalytics')}</span>
          </button>
        )}
        {permissions.viewSessionReplay && (
          <>
            <button onClick={() => onNavigate('sessions')} className={navItemClass('sessions')} title={t('admin.sessionReplay')}>
              <PlayCircle className="w-4 h-4" />
              <span className={hiddenWhenCollapsed}>{t('admin.sessionReplay')}</span>
            </button>
            <button onClick={() => onNavigate('heatmaps')} className={navItemClass('heatmaps')} title={t('admin.heatmaps')}>
              <Flame className="w-4 h-4" />
              <span className={hiddenWhenCollapsed}>{t('admin.heatmaps')}</span>
            </button>
          </>
        )}
        {permissions.manageSupport && (
          <>
            <button onClick={() => onNavigate('support')} className={navItemClass('support')} title={t('admin.support')}>
              <MessageCircle className="w-4 h-4" />
              <span className={hiddenWhenCollapsed}>{t('admin.support')}</span>
            </button>
            <button onClick={() => onNavigate('contacts')} className={navItemClass('contacts')} title={t('admin.contactInquiries')}>
              <Mail className="w-4 h-4" />
              <span className={hiddenWhenCollapsed}>{t('admin.contactInquiries')}</span>
            </button>
          </>
        )}
        <button onClick={() => onNavigate('branding')} className={navItemClass('branding')} title={t('admin.branding')}>
          <Palette className="w-4 h-4" />
          <span className={hiddenWhenCollapsed}>{t('admin.branding')}</span>
        </button>
      </nav>
    </aside>
  );
}
