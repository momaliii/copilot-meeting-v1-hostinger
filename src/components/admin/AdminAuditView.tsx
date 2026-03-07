import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, Download, ChevronDown, ChevronRight, Copy } from 'lucide-react';

const TableSkeleton = ({ rows = 10, cols = 5 }: { rows?: number; cols?: number }) => (
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

type AuditLog = {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  target_user_id?: string;
  metadata_json?: string | object;
  created_at?: string;
};

type AdminAuditViewProps = {
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  auditPage: number;
  auditTotal: number;
  auditPageSize: number;
  auditActionFilter: string;
  auditAdminFilter: string;
  auditFrom: string;
  auditTo: string;
  auditActions: string[];
  auditAdmins: { admin_id: string; admin_email: string }[];
  onActionFilterChange: (v: string) => void;
  onAdminFilterChange: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onPageChange: (page: number) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  exportLoading?: boolean;
};

export default function AdminAuditView({
  auditLogs,
  loading,
  error,
  auditPage,
  auditTotal,
  auditPageSize,
  auditActionFilter,
  auditAdminFilter,
  auditFrom,
  auditTo,
  auditActions,
  auditAdmins,
  onActionFilterChange,
  onAdminFilterChange,
  onFromChange,
  onToChange,
  onPageChange,
  onExportCSV,
  onExportJSON,
  exportLoading,
}: AdminAuditViewProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const [expandedMetadataId, setExpandedMetadataId] = useState<string | null>(null);

  const copyMetadata = (log: AuditLog) => {
    const s = log.metadata_json ? (typeof log.metadata_json === 'string' ? log.metadata_json : JSON.stringify(log.metadata_json, null, 2)) : '';
    if (s) navigator.clipboard.writeText(s);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.auditLogs')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExportCSV} disabled={exportLoading} className="flex items-center gap-1.5 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <Download className="w-4 h-4" /> {exportLoading ? t('admin.exporting') : t('admin.exportCSV')}
            </button>
            <button onClick={onExportJSON} disabled={exportLoading} className="flex items-center gap-1.5 text-sm text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <Download className="w-4 h-4" /> {t('admin.exportJSON')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.action')}</label>
            <select value={auditActionFilter} onChange={(e) => onActionFilterChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All actions</option>
              {auditActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.adminLabel')}</label>
            <select value={auditAdminFilter} onChange={(e) => onAdminFilterChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All admins</option>
              {auditAdmins.map((a) => (
                <option key={a.admin_id} value={a.admin_id}>{a.admin_email || a.admin_id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.fromDate')}</label>
            <input
              type="date"
              value={auditFrom}
              onChange={(e) => onFromChange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="YYYY-MM-DD"
              aria-label="Filter from date"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.toDate')}</label>
            <input
              type="date"
              value={auditTo}
              onChange={(e) => onToChange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="YYYY-MM-DD"
              aria-label="Filter to date"
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="p-6"><TableSkeleton rows={10} cols={5} /></div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Admin</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Target User</th>
                  <th className="px-6 py-3">Metadata</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{log.admin_email || log.admin_id}</td>
                    <td className="px-6 py-4 font-mono text-xs">{log.action}</td>
                    <td className="px-6 py-4">{log.target_user_id || '—'}</td>
                    <td className="px-6 py-4 max-w-md">
                      {log.metadata_json ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedMetadataId(expandedMetadataId === log.id ? null : log.id)}
                              className="text-slate-500 hover:text-slate-700 p-0.5"
                              aria-label={expandedMetadataId === log.id ? 'Collapse metadata' : 'Expand metadata'}
                            >
                              {expandedMetadataId === log.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyMetadata(log)}
                              className="text-slate-500 hover:text-indigo-600 p-0.5"
                              aria-label="Copy metadata"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {expandedMetadataId !== log.id && (
                              <span className="font-mono text-xs truncate max-w-[200px] block">
                                {(() => {
                                  const s = typeof log.metadata_json === 'string' ? log.metadata_json : JSON.stringify(log.metadata_json);
                                  return s.length > 60 ? s.slice(0, 60) + '…' : s;
                                })()}
                              </span>
                            )}
                          </div>
                          {expandedMetadataId === log.id && (
                            <pre className="mt-1 p-2 bg-slate-50 rounded text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto border border-slate-200">
                              {typeof log.metadata_json === 'string' ? log.metadata_json : JSON.stringify(log.metadata_json, null, 2)}
                            </pre>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <ScrollText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No audit logs yet</p>
                      <p className="text-sm text-slate-400 mt-1">Admin actions will appear here</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
            <span>Page {auditPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={auditPage <= 1} onClick={() => onPageChange(Math.max(1, auditPage - 1))} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Previous</button>
              <button disabled={auditPage >= totalPages} onClick={() => onPageChange(auditPage + 1)} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
