import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Edit2, Plus, X } from 'lucide-react';
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

export type PromoCode = {
  id: string;
  code: string;
  type: 'discount' | 'plan_time';
  discount_percent?: number | null;
  plan_id?: string | null;
  plan_months?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  uses_count?: number;
  active: number;
  created_at?: string;
  updated_at?: string;
};

type AdminPromoCodesViewProps = {
  promos: PromoCode[];
  plans: { id: string; name: string }[];
  loading: boolean;
  error: string | null;
  currentPermissions: AdminPermissions;
  onNewPromo: () => void;
  onEditPromo: (p: PromoCode) => void;
  onDeletePromo: (p: PromoCode) => void;
};

export default function AdminPromoCodesView({
  promos,
  plans,
  loading,
  error,
  currentPermissions,
  onNewPromo,
  onEditPromo,
  onDeletePromo,
}: AdminPromoCodesViewProps) {
  const { t } = useTranslation();
  const canManage = currentPermissions.managePromoCodes ?? currentPermissions.managePlans;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.promoCodes')}</h2>
        </div>
        {canManage && (
          <button
            onClick={onNewPromo}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
          >
            <Plus className="w-4 h-4" /> {t('admin.addPromo')}
          </button>
        )}
      </div>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={4} cols={3} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {promos.map((p) => (
            <div key={p.id} className="p-4 md:p-6 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono font-medium text-slate-800">{p.code}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.type === 'discount' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                  }`}>
                    {p.type === 'discount'
                      ? t('admin.promoDiscount', { percent: p.discount_percent ?? 0 })
                      : t('admin.promoPlanTime', { plan: plans.find(x => x.id === p.plan_id)?.name || p.plan_id || '?', months: p.plan_months ?? 1 })}
                  </span>
                  {(p.valid_from || p.valid_until) && (
                    <span className="text-xs text-slate-500">
                      {p.valid_from ? `${p.valid_from.slice(0, 10)}` : ''} – {p.valid_until ? p.valid_until.slice(0, 10) : '∞'}
                    </span>
                  )}
                  {p.max_uses != null && (
                    <span className="text-xs text-slate-500">
                      {p.uses_count ?? 0} / {p.max_uses} {t('admin.promoUses')}
                    </span>
                  )}
                  {p.max_uses_per_user != null && (
                    <span className="text-xs text-slate-500" title={t('admin.maxUsesPerUser')}>
                      {t('admin.perUser')}: {p.max_uses_per_user}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${p.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {p.active ? t('admin.active') : t('admin.inactive')}
                  </span>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onEditPromo(p)} className="text-slate-400 hover:text-indigo-600 p-1" aria-label={t('common.edit')}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDeletePromo(p)} className="text-slate-400 hover:text-red-600 p-1" aria-label={t('common.delete')}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {promos.length === 0 && (
            <div className="p-12 text-center">
              <Tag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">{t('admin.noPromoCodes')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('admin.createPromoHint')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
