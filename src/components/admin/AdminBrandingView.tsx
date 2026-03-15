import { useState, useEffect, useRef } from 'react';
import { Upload, RotateCcw, Save, Mic, Loader2, Trash2, Mail } from 'lucide-react';
import type { TFunction } from 'i18next';

type Settings = {
  site_name: string;
  site_description: string;
  theme_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  smtp_send_rate_limit_per_minute?: string;
  smtp_send_rate_limit_per_day?: string;
  meeting_details_design_v2?: string;
};

const DEFAULTS: Settings = {
  site_name: 'Meeting Copilot',
  site_description: 'Record, transcribe, and analyze meetings with AI',
  theme_color: '#4f46e5',
  logo_url: null,
  favicon_url: null,
  smtp_send_rate_limit_per_minute: '5',
  smtp_send_rate_limit_per_day: '20',
  meeting_details_design_v2: '0',
};

export default function AdminBrandingView({ token, t }: { token: string | null; t: TFunction }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [draft, setDraft] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setDraft(data);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setDraft(data);
        setMessage({ type: 'success', text: t('admin.brandingSaved') });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(t('admin.brandingResetConfirm'))) return;
    try {
      setResetting(true);
      setMessage(null);
      const res = await fetch('/api/admin/settings/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setDraft(data);
        setMessage({ type: 'success', text: t('admin.brandingResetDone') });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset' });
    } finally {
      setResetting(false);
    }
  };

  const handleUpload = async (file: File, field: 'logo_url' | 'favicon_url') => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/settings/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setDraft((prev) => ({ ...prev, [field]: url }));
      } else {
        setMessage({ type: 'error', text: 'Upload failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Upload failed' });
    }
  };

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('admin.branding')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('admin.brandingDesc')}</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {/* Site Name */}
        <div className="p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('admin.siteName')}</label>
          <input
            type="text"
            value={draft.site_name}
            onChange={(e) => setDraft({ ...draft, site_name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            maxLength={100}
          />
        </div>

        {/* Meta Description */}
        <div className="p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('admin.siteDescription')}</label>
          <textarea
            value={draft.site_description}
            onChange={(e) => setDraft({ ...draft, site_description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-slate-400 mt-1">{draft.site_description.length}/500</p>
        </div>

        {/* Theme Color */}
        <div className="p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('admin.themeColor')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft.theme_color}
              onChange={(e) => setDraft({ ...draft, theme_color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={draft.theme_color}
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                  setDraft({ ...draft, theme_color: e.target.value });
                }
              }}
              className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              maxLength={7}
            />
            <div className="w-8 h-8 rounded-lg border border-slate-200" style={{ backgroundColor: draft.theme_color }} />
          </div>
        </div>

        {/* Logo Upload */}
        <div className="p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('admin.logo')}</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
              {draft.logo_url ? (
                <img src={draft.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Mic className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, 'logo_url');
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Upload className="w-4 h-4" />
                {t('admin.uploadLogo')}
              </button>
              {draft.logo_url && (
                <button
                  onClick={() => setDraft({ ...draft, logo_url: null })}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('admin.removeLogo')}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{t('admin.logoHint')}</p>
        </div>

        {/* Favicon Upload */}
        <div className="p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('admin.favicon')}</label>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
              {draft.favicon_url ? (
                <img src={draft.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
              ) : (
                <div className="w-6 h-6 bg-slate-300 rounded" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, 'favicon_url');
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => faviconInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Upload className="w-4 h-4" />
                {t('admin.uploadFavicon')}
              </button>
              {draft.favicon_url && (
                <button
                  onClick={() => setDraft({ ...draft, favicon_url: null })}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('admin.removeFavicon')}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{t('admin.faviconHint')}</p>
        </div>

        {/* Feature Flags */}
        <div className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            {t('admin.featureFlags')}
          </h3>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-slate-600">{t('admin.meetingDetailsDesignV2')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={(draft.meeting_details_design_v2 ?? '0') === '1'}
              onClick={() => setDraft({ ...draft, meeting_details_design_v2: (draft.meeting_details_design_v2 ?? '0') === '1' ? '0' : '1' })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                (draft.meeting_details_design_v2 ?? '0') === '1' ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  (draft.meeting_details_design_v2 ?? '0') === '1' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
          <p className="text-xs text-slate-500 mt-1">{t('admin.meetingDetailsDesignV2Desc')}</p>
        </div>

        {/* Email / SMTP Limits */}
        <div className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Mail className="w-4 h-4" />
            {t('admin.emailSmtpLimits')}
          </h3>
          <p className="text-xs text-slate-500 mb-4">{t('admin.emailSmtpLimitsDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.emailsPerMinute')}</label>
              <input
                type="number"
                min={1}
                max={60}
                value={draft.smtp_send_rate_limit_per_minute ?? '5'}
                onChange={(e) => setDraft({ ...draft, smtp_send_rate_limit_per_minute: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.emailsPerDay')}</label>
              <input
                type="number"
                min={1}
                max={200}
                value={draft.smtp_send_rate_limit_per_day ?? '20'}
                onChange={(e) => setDraft({ ...draft, smtp_send_rate_limit_per_day: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          {t('admin.resetDefaults')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('admin.saveChanges')}
        </button>
      </div>
    </div>
  );
}
