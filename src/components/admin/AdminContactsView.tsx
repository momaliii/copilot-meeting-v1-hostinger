import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Filter, RefreshCw } from 'lucide-react';

export type ContactSubmissionRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

const TableSkeleton = ({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) => (
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

type AdminContactsViewProps = {
  contacts: ContactSubmissionRow[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  from: string;
  to: string;
  search: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
};

export default function AdminContactsView({
  contacts,
  loading,
  error,
  page,
  totalPages,
  from,
  to,
  search,
  onFromChange,
  onToChange,
  onSearchChange,
  onPageChange,
  onRefresh,
}: AdminContactsViewProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-800">{t('admin.contactInquiries')}</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              title={t('admin.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('admin.searchContact')}
            className="border border-slate-200 rounded px-2 py-1 min-w-[140px]"
          />
          <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} placeholder={t('admin.from')} className="border border-slate-200 rounded px-2 py-1" title={t('admin.fromDate')} />
          <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} placeholder={t('admin.to')} className="border border-slate-200 rounded px-2 py-1" title={t('admin.toDate')} />
        </div>
      </div>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={8} cols={5} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">{t('admin.contactName')}</th>
                  <th className="px-6 py-3">{t('admin.contactEmail')}</th>
                  <th className="px-6 py-3">{t('admin.contactSubject')}</th>
                  <th className="px-6 py-3">{t('admin.contactMessage')}</th>
                  <th className="px-6 py-3">{t('admin.contactDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                    <td className="px-6 py-4">
                      <a href={`mailto:${c.email}`} className="text-indigo-600 hover:text-indigo-700 hover:underline">
                        {c.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={c.subject}>{c.subject}</td>
                    <td className="px-6 py-4 max-w-[280px]">
                      <span className="line-clamp-2" title={c.message}>{c.message}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Mail className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600 font-medium">{t('admin.noContactSubmissions')}</p>
                      <p className="text-sm text-slate-400 mt-1">{t('admin.noContactSubmissionsHint')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
            <span>{t('admin.pageOf', { current: page, total: totalPages })}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">{t('admin.previous')}</button>
              <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">{t('admin.next')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
