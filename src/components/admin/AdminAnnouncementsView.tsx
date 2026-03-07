import React from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Edit2, Plus, X } from 'lucide-react';
import { formatDateTime } from '../../utils/format';
import type { AdminPermissions } from '../../types/admin';

const TableSkeleton = ({ rows = 4, cols = 3 }: { rows?: number; cols?: number }) => (
  <div className="divide-y divide-slate-200">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="p-6 flex items-center gap-4">
        <div className="h-4 flex-1 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

type Announcement = {
  id: string;
  message: string;
  active: boolean;
  priority?: 'info' | 'warning' | 'success';
  starts_at?: string | null;
  ends_at?: string | null;
  show_on?: string | null;
  created_at?: string;
};

type AdminAnnouncementsViewProps = {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  currentPermissions: AdminPermissions;
  onNewAnnouncement: () => void;
  onEditAnnouncement: (a: Announcement) => void;
  onDeleteAnnouncement: (a: Announcement) => void;
};

export default function AdminAnnouncementsView({
  announcements,
  loading,
  error,
  currentPermissions,
  onNewAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
}: AdminAnnouncementsViewProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.announcements')}</h2>
        </div>
        {(currentPermissions.manageAnnouncements ?? currentPermissions.manageUsers) && (
          <button
            onClick={onNewAnnouncement}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
          >
            <Plus className="w-4 h-4" /> {t('admin.newAnnouncement')}
          </button>
        )}
      </div>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={4} cols={3} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {announcements.map((a) => (
            <div key={a.id} className="p-4 md:p-6 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-slate-800">{a.message}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-xs text-slate-400">{a.created_at ? formatDateTime(a.created_at) : ''}</p>
                  {(a.starts_at || a.ends_at) && (
                    <span className="text-xs text-slate-500">
                      {a.starts_at ? `From ${a.starts_at.slice(0, 10)}` : ''} {a.starts_at && a.ends_at ? '–' : ''} {a.ends_at ? `To ${a.ends_at.slice(0, 10)}` : ''}
                    </span>
                  )}
                  {(a.show_on || 'public,user_app,admin_app').split(',').map((p) => p.trim()).filter(Boolean).map((p) => (
                    <span key={p} className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {t(`admin.showOn_${p}`)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  a.priority === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  a.priority === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {t(`admin.${(a.priority || 'info')}`)}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${a.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  {a.active ? t('admin.active') : t('admin.inactive')}
                </span>
                {(currentPermissions.manageAnnouncements ?? currentPermissions.manageUsers) && (
                  <>
                    <button onClick={() => onEditAnnouncement(a)} className="text-slate-400 hover:text-indigo-600 p-1" aria-label={`Edit announcement`}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDeleteAnnouncement(a)} className="text-slate-400 hover:text-red-600 p-1" aria-label={`Delete announcement`}>
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="p-12 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">{t('admin.noAnnouncements')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('admin.createOneBanner')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
