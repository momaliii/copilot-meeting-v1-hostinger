import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldAlert, ShieldOff, Eye, Ban, Trash2, Plus, X, Search } from 'lucide-react';

const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
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

type SecurityStats = {
  last24h: { failedLogins: number; blockedRequests: number; suspiciousPatterns: number };
  totalBlockedIPs: number;
  topOffenders: { ip_address: string; count: number }[];
  eventsByType: { event_type: string; count: number }[];
};

type SecurityEvent = {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_id: string | null;
  path: string | null;
  details: string | null;
  created_at: string;
};

type BlockedIP = {
  ip: string;
  reason: string | null;
  blocked_by: string | null;
  created_at: string;
};

type AdminSecurityViewProps = {
  stats: SecurityStats | null;
  events: SecurityEvent[];
  blockedIPs: BlockedIP[];
  eventsLoading: boolean;
  statsLoading: boolean;
  blockedIPsLoading: boolean;
  eventsError: string | null;
  eventsPage: number;
  eventsTotal: number;
  eventsPageSize: number;
  typeFilter: string;
  ipFilter: string;
  fromDate: string;
  toDate: string;
  canManage: boolean;
  onTypeFilterChange: (v: string) => void;
  onIPFilterChange: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onPageChange: (page: number) => void;
  onBlockIP: (ip: string, reason: string) => Promise<void>;
  onUnblockIP: (ip: string) => Promise<void>;
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  failed_login: 'bg-red-100 text-red-700',
  suspicious_pattern: 'bg-amber-100 text-amber-700',
  ip_blocked: 'bg-blue-100 text-blue-700',
  account_locked: 'bg-purple-100 text-purple-700',
  blocked_request: 'bg-orange-100 text-orange-700',
};

const EVENT_TYPES = ['failed_login', 'suspicious_pattern', 'ip_blocked', 'account_locked', 'blocked_request'];

// IPv4 or IPv6 validation (supports CIDR when server supports it)
function isValidIPOrCIDR(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const cidrMatch = trimmed.match(/^(.+)\/(\d+)$/);
  const toValidate = cidrMatch ? cidrMatch[1] : trimmed;
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
  const ipv6 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
  if (!ipv4.test(toValidate) && !ipv6.test(toValidate)) return false;
  if (cidrMatch) {
    const prefix = parseInt(cidrMatch[2], 10);
    return prefix >= 0 && prefix <= 128;
  }
  return true;
}

export default function AdminSecurityView({
  stats,
  events,
  blockedIPs,
  eventsLoading,
  statsLoading,
  blockedIPsLoading,
  eventsError,
  eventsPage,
  eventsTotal,
  eventsPageSize,
  typeFilter,
  ipFilter,
  fromDate,
  toDate,
  canManage,
  onTypeFilterChange,
  onIPFilterChange,
  onFromChange,
  onToChange,
  onPageChange,
  onBlockIP,
  onUnblockIP,
}: AdminSecurityViewProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(eventsTotal / eventsPageSize));

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockIPValue, setBlockIPValue] = useState('');
  const [blockReasonValue, setBlockReasonValue] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockIPError, setBlockIPError] = useState<string | null>(null);

  const handleBlockSubmit = async () => {
    if (!blockIPValue.trim()) return;
    if (!isValidIPOrCIDR(blockIPValue.trim())) {
      setBlockIPError('Invalid IP address or CIDR format');
      return;
    }
    setBlockIPError(null);
    setBlockLoading(true);
    try {
      await onBlockIP(blockIPValue.trim(), blockReasonValue.trim());
      setBlockIPValue('');
      setBlockReasonValue('');
      setShowBlockForm(false);
    } finally {
      setBlockLoading(false);
    }
  };

  const statCards = [
    {
      label: t('admin.failedLogins'),
      value: stats?.last24h.failedLogins ?? 0,
      icon: ShieldAlert,
      accent: 'bg-red-100 text-red-600',
    },
    {
      label: t('admin.suspiciousPatterns'),
      value: stats?.last24h.suspiciousPatterns ?? 0,
      icon: Eye,
      accent: 'bg-amber-100 text-amber-600',
    },
    {
      label: t('admin.blockedRequests'),
      value: stats?.last24h.blockedRequests ?? 0,
      icon: Ban,
      accent: 'bg-orange-100 text-orange-600',
    },
    {
      label: t('admin.totalBlockedIPs'),
      value: stats?.totalBlockedIPs ?? 0,
      icon: ShieldOff,
      accent: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.accent}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                {statsLoading ? (
                  <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                )}
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">{t('admin.last24h')}</p>
          </div>
        ))}
      </div>

      {/* Blocked IPs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.blockedIPs')}</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {blockedIPs.length}
            </span>
          </div>
          {canManage && (
            <button
              onClick={() => setShowBlockForm(!showBlockForm)}
              className="flex items-center gap-1.5 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showBlockForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showBlockForm ? t('common.close') : t('admin.blockIP')}
            </button>
          )}
        </div>

        {showBlockForm && canManage && (
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.ipAddress')}</label>
                <input
                  type="text"
                  value={blockIPValue}
                  onChange={(e) => {
                    setBlockIPValue(e.target.value);
                    setBlockIPError(null);
                  }}
                  placeholder="e.g. 192.168.1.100 or 10.0.0.0/24"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${blockIPError ? 'border-red-500' : 'border-slate-200'}`}
                />
                {blockIPError && <p className="text-xs text-red-600 mt-1">{blockIPError}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.reason')}</label>
                <input
                  type="text"
                  value={blockReasonValue}
                  onChange={(e) => setBlockReasonValue(e.target.value)}
                  placeholder={t('admin.reason')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleBlockSubmit}
                disabled={blockLoading || !blockIPValue.trim() || !isValidIPOrCIDR(blockIPValue.trim())}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {blockLoading ? '...' : t('admin.blockIP')}
              </button>
            </div>
          </div>
        )}

        {blockedIPsLoading ? (
          <div className="p-6"><TableSkeleton rows={3} cols={5} /></div>
        ) : blockedIPs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
            <p className="text-slate-500 font-medium">{t('admin.noBlockedIPs')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">{t('admin.ipAddress')}</th>
                  <th className="px-6 py-3">{t('admin.reason')}</th>
                  <th className="px-6 py-3">{t('admin.blockedBy')}</th>
                  <th className="px-6 py-3">{t('admin.date')}</th>
                  {canManage && <th className="px-6 py-3">{t('admin.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {blockedIPs.map((ip) => (
                  <tr key={ip.ip} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">{ip.ip}</td>
                    <td className="px-6 py-4">{ip.reason || '—'}</td>
                    <td className="px-6 py-4">{ip.blocked_by || '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{ip.created_at ? new Date(ip.created_at).toLocaleString() : '—'}</td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onUnblockIP(ip.ip)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('admin.unblock')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Events */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.securityEvents')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.eventType')}</label>
              <select
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">{t('admin.allTypes')}</option>
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>{et.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.ipAddress')}</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={ipFilter}
                  onChange={(e) => onIPFilterChange(e.target.value)}
                  placeholder="Filter by IP"
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.fromDate')}</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('admin.toDate')}</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {eventsLoading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={6} /></div>
        ) : eventsError ? (
          <div className="p-6 text-sm text-red-600">{eventsError}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">{t('admin.eventType')}</th>
                    <th className="px-6 py-3">{t('admin.ipAddress')}</th>
                    <th className="px-6 py-3">{t('admin.userId')}</th>
                    <th className="px-6 py-3">{t('admin.path')}</th>
                    <th className="px-6 py-3">{t('admin.details')}</th>
                    <th className="px-6 py-3">{t('admin.timestamp')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[ev.event_type] || 'bg-slate-100 text-slate-600'}`}>
                          {ev.event_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{ev.ip_address || '—'}</td>
                      <td className="px-6 py-4 text-xs">{ev.user_id || '—'}</td>
                      <td className="px-6 py-4 font-mono text-xs">{ev.path || '—'}</td>
                      <td className="px-6 py-4 max-w-xs truncate text-xs" title={ev.details || ''}>{ev.details || '—'}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Shield className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
                        <p className="text-slate-500 font-medium">{t('admin.noSecurityEvents')}</p>
                        <p className="text-sm text-slate-400 mt-1">{t('admin.securityEventsHint')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
              <span>Page {eventsPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={eventsPage <= 1} onClick={() => onPageChange(Math.max(1, eventsPage - 1))} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Previous</button>
                <button disabled={eventsPage >= totalPages} onClick={() => onPageChange(eventsPage + 1)} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top Offenders */}
      {stats && stats.topOffenders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.topOffenders')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">{t('admin.ipAddress')}</th>
                  <th className="px-6 py-3">{t('admin.eventCount')}</th>
                  {canManage && <th className="px-6 py-3">{t('admin.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.topOffenders.map((offender) => {
                  const alreadyBlocked = blockedIPs.some(b => b.ip === offender.ip_address);
                  return (
                    <tr key={offender.ip_address} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">{offender.ip_address}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {offender.count}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4">
                          {alreadyBlocked ? (
                            <span className="text-xs text-slate-400">{t('admin.alreadyBlocked')}</span>
                          ) : (
                            <button
                              onClick={() => onBlockIP(offender.ip_address, 'Top offender - blocked from security dashboard')}
                              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              {t('admin.quickBlock')}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
