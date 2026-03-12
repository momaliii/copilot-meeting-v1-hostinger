import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Server, Cpu, HardDrive, Clock, RefreshCw,
  Database, Bot, Mic, Mail, KeyRound,
  Users, FileText, MonitorPlay, MessageSquare,
  Shield, ExternalLink
} from 'lucide-react';

export type SystemStatus = {
  db: 'ok' | 'error';
  checks: {
    geminiConfigured: boolean;
    jwtConfigured: boolean;
    deepgramConfigured: boolean;
    smtpConfigured: boolean;
  };
  server: {
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
    uptimeSeconds: number;
    startedAt: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpu: { load1m: number; load5m: number; load15m: number };
  environment: {
    nodeEnv: string;
    appUrl: string;
    dbType: string;
  };
  storage: {
    users: number;
    meetings: number;
    sessions: number;
    feedback: number;
  };
  securitySummary: {
    blockedIPs: number;
    events24h: number;
  };
};

type Props = {
  status: SystemStatus | null;
  loading: boolean;
  lastUpdated: number | null;
  onRefresh: () => void;
  onNavigate: (page: string) => void;
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
  );
}

const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
    <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
    <div className="h-7 w-28 bg-slate-200 rounded" />
  </div>
);

export default function AdminStatusView({ status, loading, lastUpdated, onRefresh, onNavigate }: Props) {
  const { t } = useTranslation();

  const secondsAgo = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 1000) : null;

  if (loading && !status) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
          <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded mb-2" />)}
        </div>
      </div>
    );
  }

  if (!status) return null;

  const heapPct = Math.round((status.memory.heapUsed / status.memory.heapTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
            <RefreshCw className="w-3 h-3" />
            {t('admin.autoRefresh', 'Auto-refresh: 30s')}
          </span>
          {secondsAgo !== null && (
            <span>{t('admin.lastUpdated', 'Last updated')}: {secondsAgo}s ago</span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.refresh', 'Refresh')}
        </button>
      </div>

      {/* Section A: Server Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Uptime */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Clock className="w-4 h-4" />
            {t('admin.uptime', 'Uptime')}
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatUptime(status.server.uptimeSeconds)}</p>
          <p className="text-xs text-slate-400 mt-1">Started {new Date(status.server.startedAt).toLocaleString()}</p>
        </div>

        {/* Node.js Version */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Server className="w-4 h-4" />
            {t('admin.nodeVersion', 'Node.js Version')}
          </div>
          <p className="text-2xl font-bold text-slate-800">{status.server.nodeVersion}</p>
          <p className="text-xs text-slate-400 mt-1">{status.server.hostname}</p>
        </div>

        {/* Platform */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <HardDrive className="w-4 h-4" />
            {t('admin.platform', 'Platform')}
          </div>
          <p className="text-lg font-bold text-slate-800">{status.server.platform}</p>
          <p className="text-xs text-slate-400 mt-1">{status.server.arch}</p>
        </div>

        {/* Memory */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Cpu className="w-4 h-4" />
            {t('admin.memoryUsage', 'Memory Usage')}
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatBytes(status.memory.heapUsed)}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Heap</span>
              <span>{heapPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${heapPct > 85 ? 'bg-red-500' : heapPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${heapPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{formatBytes(status.memory.heapUsed)} / {formatBytes(status.memory.heapTotal)} (RSS: {formatBytes(status.memory.rss)})</p>
          </div>
        </div>

        {/* CPU Load */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Cpu className="w-4 h-4" />
            {t('admin.cpuLoad', 'CPU Load')}
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <p className="text-2xl font-bold text-slate-800">{status.cpu.load1m.toFixed(2)}</p>
              <p className="text-xs text-slate-400">1m</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-600">{status.cpu.load5m.toFixed(2)}</p>
              <p className="text-xs text-slate-400">5m</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-600">{status.cpu.load15m.toFixed(2)}</p>
              <p className="text-xs text-slate-400">15m</p>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Server className="w-4 h-4" />
            {t('admin.environment', 'Environment')}
          </div>
          <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-semibold ${status.environment.nodeEnv === 'production' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {status.environment.nodeEnv}
          </span>
          <p className="text-xs text-slate-400 mt-2">{status.environment.dbType} &middot; {status.environment.appUrl}</p>
        </div>
      </div>

      {/* Section B: Dependency Health */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{t('admin.dependencies', 'Dependencies')}</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase">Service</th>
              <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-6 py-3 flex items-center gap-2"><Database className="w-4 h-4 text-slate-400" /> Database</td>
              <td className="px-6 py-3"><StatusDot ok={status.db === 'ok'} /> <span className="ms-1.5">{status.db === 'ok' ? t('admin.healthy', 'Healthy') : t('admin.unhealthy', 'Unhealthy')}</span></td>
              <td className="px-6 py-3 text-slate-500">{status.environment.dbType}</td>
            </tr>
            <tr>
              <td className="px-6 py-3 flex items-center gap-2"><Bot className="w-4 h-4 text-slate-400" /> Gemini AI</td>
              <td className="px-6 py-3"><StatusDot ok={status.checks.geminiConfigured} /> <span className="ms-1.5">{status.checks.geminiConfigured ? t('admin.configured', 'Configured') : t('admin.notConfigured', 'Not Configured')}</span></td>
              <td className="px-6 py-3 text-slate-500">GEMINI_API_KEY</td>
            </tr>
            <tr>
              <td className="px-6 py-3 flex items-center gap-2"><Mic className="w-4 h-4 text-slate-400" /> {t('admin.deepgram', 'Deepgram Transcription')}</td>
              <td className="px-6 py-3"><StatusDot ok={status.checks.deepgramConfigured} /> <span className="ms-1.5">{status.checks.deepgramConfigured ? t('admin.configured', 'Configured') : t('admin.notConfigured', 'Not Configured')}</span></td>
              <td className="px-6 py-3 text-slate-500">DEEPGRAM_API_KEY</td>
            </tr>
            <tr>
              <td className="px-6 py-3 flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400" /> JWT Auth</td>
              <td className="px-6 py-3"><StatusDot ok={status.checks.jwtConfigured} /> <span className="ms-1.5">{status.checks.jwtConfigured ? t('admin.configured', 'Configured') : t('admin.notConfigured', 'Not Configured')}</span></td>
              <td className="px-6 py-3 text-slate-500">JWT_SECRET</td>
            </tr>
            <tr>
              <td className="px-6 py-3 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {t('admin.emailService', 'Email / SMTP')}</td>
              <td className="px-6 py-3"><StatusDot ok={status.checks.smtpConfigured} /> <span className="ms-1.5">{status.checks.smtpConfigured ? t('admin.configured', 'Configured') : t('admin.notConfigured', 'Not Configured')}</span></td>
              <td className="px-6 py-3 text-slate-500">SMTP_HOST / SMTP_USER</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section C: Storage & Usage */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">{t('admin.storage', 'Storage & Usage')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <Users className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{status.storage.users.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{t('admin.totalUsers', 'Total Users')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <FileText className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{status.storage.meetings.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{t('admin.totalMeetings', 'Total Meetings')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <MonitorPlay className="w-5 h-5 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{status.storage.sessions.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{t('admin.totalSessions', 'Total Sessions')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <MessageSquare className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{status.storage.feedback.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{t('admin.totalFeedback', 'Total Feedback')}</p>
          </div>
        </div>
      </div>

      {/* Section D: Security Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            {t('admin.securitySummary', 'Security Summary')}
          </h3>
          <button
            onClick={() => onNavigate('security')}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('admin.viewSecurityGuard', 'View Security Guard')}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="text-2xl font-bold text-slate-800">{status.securitySummary.blockedIPs}</p>
            <p className="text-xs text-slate-500">{t('admin.blockedIPs', 'Blocked IPs')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{status.securitySummary.events24h}</p>
            <p className="text-xs text-slate-500">{t('admin.securityEvents24h', 'Events (24h)')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
