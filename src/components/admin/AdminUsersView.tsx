import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Search, CheckCircle2, Ban, Download, ChevronUp, ChevronDown } from 'lucide-react';
import type { UserRow, Plan, AdminPermissions } from '../../types/admin';

type SortKey = 'email' | 'role' | 'plan_id' | 'status' | null;
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown className="w-4 h-4 opacity-40" />;
  return dir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
}

const TableSkeleton = ({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) => (
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

type AdminUsersViewProps = {
  users: UserRow[];
  plans: Plan[];
  loading: boolean;
  error: string | null;
  userPage: number;
  userTotalPages: number;
  selectedUserIds: string[];
  userQuery: string;
  roleFilter: string;
  statusFilter: string;
  planFilter: string;
  bulkAction: 'ban' | 'unban' | 'setRole' | 'setPlan';
  bulkRole: 'user' | 'admin';
  bulkPlanId: string;
  currentPermissions: AdminPermissions;
  onQueryChange: (q: string) => void;
  onRoleFilterChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onPlanFilterChange: (v: string) => void;
  onPageChange: (page: number) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectUser: (id: string, checked: boolean) => void;
  onBulkActionChange: (a: 'ban' | 'unban' | 'setRole' | 'setPlan') => void;
  onBulkRoleChange: (r: 'user' | 'admin') => void;
  onBulkPlanIdChange: (id: string) => void;
  onCreateUser: () => void;
  onBulkAction: () => void;
  onBulkActionConfirm: () => void;
  showBulkConfirm: boolean;
  onBulkConfirmClose: () => void;
  onExport: () => void;
  exportLoading?: boolean;
  onLoadUserDetail: (id: string) => void;
  onRoleChange: (id: string, role: string) => void;
  onPlanChange: (id: string, plan_id: string) => void;
  onBan: (id: string, isBanned: boolean) => void;
};

export default function AdminUsersView({
  users,
  plans,
  loading,
  error,
  userPage,
  userTotalPages,
  selectedUserIds,
  userQuery,
  roleFilter,
  statusFilter,
  planFilter,
  bulkAction,
  bulkRole,
  bulkPlanId,
  currentPermissions,
  onQueryChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPlanFilterChange,
  onPageChange,
  onSelectAll,
  onSelectUser,
  onBulkActionChange,
  onBulkRoleChange,
  onBulkPlanIdChange,
  onCreateUser,
  onBulkAction,
  onBulkActionConfirm,
  showBulkConfirm,
  onBulkConfirmClose,
  onExport,
  exportLoading,
  onLoadUserDetail,
  onRoleChange,
  onPlanChange,
  onBan,
}: AdminUsersViewProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(userQuery);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    setSearchInput(userQuery);
  }, [userQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== userQuery) onQueryChange(searchInput);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, userQuery]);

  const sortedUsers = useMemo(() => {
    if (!sortKey) return users;
    return [...users].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === 'string' ? (aVal as string).localeCompare(bVal as string) : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [users, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const bulkActionLabel = bulkAction === 'setRole' ? `Set role to ${bulkRole}` : bulkAction === 'setPlan' ? `Set plan to ${plans.find((p) => p.id === bulkPlanId)?.name || bulkPlanId}` : bulkAction;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 space-y-3">
        <div className={`flex items-center justify-between gap-2 ${selectedUserIds.length > 0 ? 'bg-indigo-50 py-3 -mx-6 px-6 rounded-lg border border-indigo-100' : ''}`}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.manageUsers')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {currentPermissions.viewUsers && (
              <button onClick={onExport} disabled={exportLoading} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
                <Download className="w-4 h-4" /> {exportLoading ? t('admin.exporting') : t('admin.export')}
              </button>
            )}
            {currentPermissions.manageUsers && (
              <button onClick={onCreateUser} className="flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                <Plus className="w-4 h-4" /> {t('admin.createUser')}
              </button>
            )}
            {selectedUserIds.length > 0 && currentPermissions.manageUsers && (
              <div className="flex items-center gap-2">
                <select value={bulkAction} onChange={(e) => onBulkActionChange(e.target.value as any)} className="border border-slate-200 rounded px-2 py-1 text-sm">
                  <option value="ban">{t('admin.ban')}</option>
                  <option value="unban">{t('admin.unban')}</option>
                  <option value="setRole">{t('admin.setRole')}</option>
                  <option value="setPlan">{t('admin.setPlan')}</option>
                </select>
                {bulkAction === 'setRole' && (
                  <select value={bulkRole} onChange={(e) => onBulkRoleChange(e.target.value as any)} className="border border-slate-200 rounded px-2 py-1 text-sm">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                {bulkAction === 'setPlan' && (
                  <select value={bulkPlanId} onChange={(e) => onBulkPlanIdChange(e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-sm">
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <button onClick={onBulkAction} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">{t('admin.apply')} ({selectedUserIds.length})</button>
              </div>
            )}
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-2.5 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('admin.searchUsers')}
              className="w-full ps-9 pe-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">{t('admin.allRoles')}</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">{t('admin.allStatuses')}</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select value={planFilter} onChange={(e) => onPlanFilterChange(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">{t('admin.allPlans')}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={8} cols={6} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUserIds.length === users.length}
                      onChange={(e) => onSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-3">
                    <button type="button" onClick={() => toggleSort('email')} className="flex items-center gap-1 hover:text-slate-700">
                      {t('admin.email')} <SortIcon active={sortKey === 'email'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3">
                    <button type="button" onClick={() => toggleSort('role')} className="flex items-center gap-1 hover:text-slate-700">
                      {t('admin.role')} <SortIcon active={sortKey === 'role'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3">
                    <button type="button" onClick={() => toggleSort('plan_id')} className="flex items-center gap-1 hover:text-slate-700">
                      {t('admin.plan')} <SortIcon active={sortKey === 'plan_id'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3">
                    <button type="button" onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-slate-700">
                      {t('admin.status')} <SortIcon active={sortKey === 'status'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-end">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(e) => onSelectUser(u.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <button onClick={() => onLoadUserDetail(u.id)} className="hover:text-indigo-600 underline-offset-2 hover:underline">
                        {u.email}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {currentPermissions.manageRoles ? (
                        <select value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value)} className="bg-transparent border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" disabled={u.id === 'admin-1'}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-sm">{u.role}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {currentPermissions.managePlans ? (
                        <select value={u.plan_id} onChange={(e) => onPlanChange(u.id, e.target.value)} className="bg-transparent border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500">
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm">{u.plan_id}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <Ban className="w-3.5 h-3.5" /> Banned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-end">
                      {u.id !== 'admin-1' && currentPermissions.manageUsers && (
                        <button
                          onClick={() => onBan(u.id, u.status === 'banned')}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${u.status === 'banned' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        >
                          {u.status === 'banned' ? t('admin.unban') : t('admin.ban')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600 font-medium">No users match your filters</p>
                      <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
            <span>Page {userPage} of {userTotalPages}</span>
            <div className="flex gap-2">
              <button disabled={userPage <= 1} onClick={() => onPageChange(Math.max(1, userPage - 1))} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Previous</button>
              <button disabled={userPage >= userTotalPages} onClick={() => onPageChange(userPage + 1)} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}

      {showBulkConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('admin.confirmBulkAction')}</h3>
            <p className="text-slate-600 text-sm mb-4">
              {t('admin.bulkActionConfirm', { count: selectedUserIds.length })}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={onBulkConfirmClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">
                {t('admin.cancel')}
              </button>
              <button type="button" onClick={onBulkActionConfirm} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
                {t('admin.apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
