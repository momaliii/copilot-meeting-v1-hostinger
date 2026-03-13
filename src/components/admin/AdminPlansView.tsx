import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Edit2, Plus, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Plan, AdminPermissions } from '../../types/admin';

type SortKey = 'name' | 'price' | 'minutes_limit' | null;
type SortDir = 'asc' | 'desc';

const TableSkeleton = ({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-start text-sm">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-6 py-3"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /></th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {Array.from({ length: rows }).map((_, ri) => (
          <tr key={ri}>
            {Array.from({ length: cols }).map((_, ci) => (
              <td key={ci} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: ci === 0 ? 120 : 80 }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

type AdminPlansViewProps = {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  currentPermissions: AdminPermissions;
  onNewPlan: () => void;
  onEditPlan: (plan: Plan) => void;
  onDuplicatePlan: (plan: Plan) => void;
  onDeletePlan: (plan: Plan) => void;
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown className="w-4 h-4 opacity-40" />;
  return dir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
}

export default function AdminPlansView({
  plans,
  loading,
  error,
  currentPermissions,
  onNewPlan,
  onEditPlan,
  onDuplicatePlan,
  onDeletePlan,
}: AdminPlansViewProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null);

  const sortedPlans = useMemo(() => {
    if (!sortKey) return plans;
    return [...plans].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === 'string' ? (aVal as string).localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [plans, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDeleteClick = (p: Plan) => setDeleteConfirm(p);

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeletePlan(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.managePlans')}</h2>
        </div>
        {currentPermissions.managePlans && (
          <button
            onClick={onNewPlan}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('admin.newPlan')}
          </button>
        )}
      </div>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={4} cols={5} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">{t('admin.id')}</th>
                <th className="px-6 py-3">
                  <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-700">
                    {t('admin.name')} <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button type="button" onClick={() => toggleSort('price')} className="flex items-center gap-1 hover:text-slate-700">
                    {t('admin.price')} ($) <SortIcon active={sortKey === 'price'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button type="button" onClick={() => toggleSort('minutes_limit')} className="flex items-center gap-1 hover:text-slate-700">
                    {t('admin.minutesLimit')} <SortIcon active={sortKey === 'minutes_limit'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-3">{t('admin.langChanges')}</th>
                <th className="px-6 py-3">{t('admin.users')}</th>
                <th className="px-6 py-3 text-end">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedPlans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">
                    {p.id}
                    {p.id === 'admin' && (
                      <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">SYSTEM</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4">${p.price}</td>
                  <td className="px-6 py-4">{p.minutes_limit} {t('admin.mins')}</td>
                  <td className="px-6 py-4">{p.language_changes_limit === -1 || p.language_changes_limit == null ? t('admin.unlimited') : p.language_changes_limit}</td>
                  <td className="px-6 py-4 text-slate-500">{p.user_count ?? 0}</td>
                  <td className="px-6 py-4 text-end">
                    {currentPermissions.managePlans && p.id !== 'admin' && (
                        <div className="flex items-center justify-end gap-1 rtl:flex-row-reverse">
                        <button
                          onClick={() => onEditPlan(p)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          aria-label={`${t('admin.editPlan')} ${p.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDuplicatePlan(p)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          aria-label={t('admin.duplicate') + ' ' + p.name}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(p)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          aria-label={t('admin.delete') + ' ' + p.name}
                          title={(p.user_count ?? 0) > 0 ? `${p.user_count} users on this plan` : 'Delete plan'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {p.id === 'admin' && (
                      <span className="text-xs text-slate-400">{t('admin.systemPlan')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium">{t('admin.noPlansFound')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('admin.createPlanToGetStarted')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('admin.deletePlan')}</h3>
            <p className="text-slate-600 text-sm mb-4">
              {(deleteConfirm.user_count ?? 0) > 0
                ? t('admin.deletePlanHasUsers', { name: deleteConfirm.name, count: deleteConfirm.user_count ?? 0 })
                : t('admin.deletePlanConfirm', { name: deleteConfirm.name })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
              >
                {t('admin.cancel')}
              </button>
              {(deleteConfirm.user_count ?? 0) === 0 && (
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                >
                  {t('admin.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
