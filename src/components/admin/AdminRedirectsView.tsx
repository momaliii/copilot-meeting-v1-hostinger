import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Edit2, Plus, X } from 'lucide-react';
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

export type RedirectRule = {
  id: string;
  from_path: string;
  to_path: string;
  active: number;
  created_at?: string;
  updated_at?: string;
};

type AdminRedirectsViewProps = {
  redirects: RedirectRule[];
  loading: boolean;
  error: string | null;
  currentPermissions: AdminPermissions;
  onNewRedirect: () => void;
  onEditRedirect: (r: RedirectRule) => void;
  onDeleteRedirect: (r: RedirectRule) => void;
  onToggleActive: (r: RedirectRule) => void;
};

export default function AdminRedirectsView({
  redirects,
  loading,
  error,
  currentPermissions,
  onNewRedirect,
  onEditRedirect,
  onDeleteRedirect,
  onToggleActive,
}: AdminRedirectsViewProps) {
  const { t } = useTranslation();

  if (!currentPermissions.manageRedirects) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.redirects')}</h2>
        </div>
        <button
          onClick={onNewRedirect}
          className="flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
        >
          <Plus className="w-4 h-4" /> {t('admin.addRedirect')}
        </button>
      </div>
      <p className="px-6 py-2 text-sm text-slate-500 border-b border-slate-100">{t('admin.redirectsDesc')}</p>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={4} cols={3} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {redirects.map((r) => (
            <div key={r.id} className="p-4 md:p-6 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{r.from_path}</code>
                  <span className="text-slate-400">→</span>
                  <code className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded truncate max-w-[200px]">
                    {r.to_path}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggleActive(r)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    r.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {r.active ? t('admin.active') : t('admin.inactive')}
                </button>
                <button onClick={() => onEditRedirect(r)} className="text-slate-400 hover:text-indigo-600 p-1" aria-label={t('common.edit')}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteRedirect(r)} className="text-slate-400 hover:text-red-600 p-1" aria-label={t('common.delete')}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {redirects.length === 0 && (
            <div className="p-12 text-center">
              <Link2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">{t('admin.noRedirects')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('admin.redirectsDesc')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
