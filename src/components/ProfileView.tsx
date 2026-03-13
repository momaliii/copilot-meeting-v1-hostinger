import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { Loader2, CheckCircle2, AlertCircle, User, Cloud, Camera, Mail, Shield, Trash2, Zap } from 'lucide-react';

type Usage = {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  limitMinutes: number;
};

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

function getPasswordStrength(pwd: string): 'weak' | 'fair' | 'good' | 'strong' | null {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'fair';
  if (score <= 4) return 'good';
  return 'strong';
}

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
  return null;
}

const MESSAGE_AUTO_DISMISS_MS = 4000;

type ProfileViewProps = {
  onPreferencesChange?: () => void;
  onNavigateToCheckout?: () => void;
};

export default function ProfileView({ onPreferencesChange, onNavigateToCheckout }: ProfileViewProps = {}) {
  const { t } = useTranslation();
  const { user, token, updateUser } = useAuth();
  const profileMessageRef = useRef<HTMLDivElement>(null);
  const passwordMessageRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [cloudSaveEnabled, setCloudSaveEnabled] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [cloudSaveUpdating, setCloudSaveUpdating] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAStatusLoading, setTwoFAStatusLoading] = useState(false);
  const [twoFASetupStep, setTwoFASetupStep] = useState<'idle' | 'qr' | 'verify' | 'backup'>('idle');
  const [twoFAQRUrl, setTwoFAQRUrl] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCancelPlanConfirm, setShowCancelPlanConfirm] = useState(false);
  const [cancelPlanLoading, setCancelPlanLoading] = useState(false);
  const [cancelPlanMessage, setCancelPlanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const fetchUsage = useCallback(async () => {
    if (!token) return;
    setUsageLoading(true);
    try {
      const res = await fetch('/api/user/usage', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage', err);
    } finally {
      setUsageLoading(false);
    }
  }, [token]);

  const fetchPreferences = useCallback(async () => {
    if (!token) return;
    setPreferencesLoading(true);
    try {
      const res = await fetch('/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const { cloudSaveEnabled: enabled } = await res.json();
        setCloudSaveEnabled(!!enabled);
      }
    } catch (err) {
      console.error('Failed to fetch preferences', err);
    } finally {
      setPreferencesLoading(false);
    }
  }, [token]);

  const fetch2FAStatus = useCallback(async () => {
    if (!token) return;
    setTwoFAStatusLoading(true);
    try {
      const res = await fetch('/api/user/2fa/status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTwoFAEnabled(!!data.enabled);
      }
    } catch (err) {
      console.error('Failed to fetch 2FA status', err);
    } finally {
      setTwoFAStatusLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsage();
    fetchPreferences();
    fetch2FAStatus();
  }, [fetchUsage, fetchPreferences, fetch2FAStatus]);

  useEffect(() => {
    if (!profileMessage) return;
    const id = setTimeout(() => setProfileMessage(null), MESSAGE_AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [profileMessage]);

  useEffect(() => {
    if (!passwordMessage) return;
    const id = setTimeout(() => setPasswordMessage(null), MESSAGE_AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [passwordMessage]);

  useEffect(() => {
    if (profileMessage) profileMessageRef.current?.focus();
  }, [profileMessage]);

  useEffect(() => {
    if (passwordMessage) passwordMessageRef.current?.focus();
  }, [passwordMessage]);

  useEffect(() => {
    if (!emailChangeMessage) return;
    const id = setTimeout(() => setEmailChangeMessage(null), MESSAGE_AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [emailChangeMessage]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      updateUser(data.user);
      setProfileMessage({ type: 'success', text: t('profile.profileUpdated') });
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setPasswordMessage({ type: 'error', text: pwdErr });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('profile.passwordsNoMatch') });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordMessage({ type: 'success', text: t('profile.passwordUpdated') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setAvatarLoading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/user/avatar', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload avatar');
      updateUser(data.user);
    } catch (err: any) {
      setAvatarError(err.message);
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setEmailChangeLoading(true);
    setEmailChangeMessage(null);
    try {
      const res = await fetch('/api/user/email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: emailChangePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification email');
      setEmailChangeMessage({ type: 'success', text: t('profile.emailChangeRequested') });
      setNewEmail('');
      setEmailChangePassword('');
    } catch (err: any) {
      setEmailChangeMessage({ type: 'error', text: err.message });
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!token) return;
    setTwoFALoading(true);
    setTwoFAMessage(null);
    try {
      const res = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enable 2FA');
      setTwoFAQRUrl(data.qrDataUrl);
      setTwoFASetupStep('qr');
    } catch (err: any) {
      setTwoFAMessage({ type: 'error', text: err.message });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setTwoFALoading(true);
    setTwoFAMessage(null);
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setTwoFABackupCodes(data.backupCodes || []);
      setTwoFASetupStep('backup');
      setTwoFAEnabled(true);
    } catch (err: any) {
      setTwoFAMessage({ type: 'error', text: err.message });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setTwoFALoading(true);
    setTwoFAMessage(null);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: disable2FAPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');
      setTwoFAEnabled(false);
      setTwoFASetupStep('idle');
      setDisable2FAPassword('');
      setTwoFAMessage({ type: 'success', text: t('profile.twoFADisabled') });
    } catch (err: any) {
      setTwoFAMessage({ type: 'error', text: err.message });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE' || !token) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!token) return;
    setCancelPlanLoading(true);
    setCancelPlanMessage(null);
    try {
      const res = await fetch('/api/user/cancel-plan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {
        data = {};
      }
      if (!res.ok) throw new Error(data.error || 'Failed to cancel plan');
      updateUser({ ...user!, plan_id: 'starter' });
      setShowCancelPlanConfirm(false);
      setCancelPlanMessage({ type: 'success', text: t('profile.planDowngraded') });
      setCloudSaveEnabled(false);
      onPreferencesChange?.();
    } catch (err: any) {
      setCancelPlanMessage({ type: 'error', text: err.message });
    } finally {
      setCancelPlanLoading(false);
    }
  };

  const handleCloudSaveToggle = async () => {
    if (!token) return;
    const canUse = user?.plan_features?.cloud_save || user?.role === 'admin';
    if (!canUse) return;
    setCloudSaveUpdating(true);
    try {
      const next = !cloudSaveEnabled;
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cloudSaveEnabled: next }),
      });
      if (res.ok) {
        setCloudSaveEnabled(next);
        onPreferencesChange?.();
      }
    } catch (err) {
      console.error('Failed to update cloud save', err);
    } finally {
      setCloudSaveUpdating(false);
    }
  };

  const isProfileDirty = name !== (user?.name || '');
  const passwordStrength = getPasswordStrength(newPassword);
  const canUseCloudSave = user?.plan_features?.cloud_save || user?.role === 'admin';

  return (
    <section className="max-w-2xl mx-auto space-y-6 animate-in fade-in" aria-labelledby="profile-heading">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div
            className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-semibold text-lg overflow-hidden"
            aria-hidden
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(user?.name, user?.email)
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {avatarLoading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={avatarLoading}
            />
          </label>
        </div>
        <div>
          <h2 id="profile-heading" className="text-xl font-semibold text-slate-900">
            {t('profile.profileSettings')}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('profile.manageAccount')}</p>
        </div>
      </div>
      {avatarError && (
        <p className="text-sm text-red-600" role="alert">
          {avatarError}
        </p>
      )}

      {/* Account Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{t('profile.accountOverview')}</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('profile.plan')}</p>
            <p className="mt-1 font-medium text-slate-900 capitalize">
              {user?.role === 'admin' ? t('common.admin') : user?.plan_id || 'starter'}
            </p>
            {usage && (usage as any).planExpiresAt && (
              <p className="text-xs text-slate-500 mt-0.5">
                {t('profile.expiresOn', { date: new Date((usage as any).planExpiresAt).toLocaleDateString() })}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('profile.usage')}</p>
            {usageLoading ? (
              <Loader2 className="w-5 h-5 mt-1 animate-spin text-slate-400" />
            ) : usage ? (
              <p className="mt-1 font-medium text-slate-900">
                {t('profile.minutesUsed', {
                  used: Math.ceil(usage.usedSeconds / 60),
                  limit: usage.limitMinutes,
                })}
              </p>
            ) : (
              <p className="mt-1 text-slate-500">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role</p>
            <p className="mt-1">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {user?.role === 'admin' ? t('common.admin') : 'User'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Plan & Billing */}
      {user?.role !== 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-slate-500" />
              {t('profile.planBilling')}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{t('profile.planBillingDesc')}</p>
          </div>
          <div className="p-6">
            {cancelPlanMessage && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                  cancelPlanMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}
              >
                {cancelPlanMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                {cancelPlanMessage.text}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {user?.plan_id !== 'pro' && onNavigateToCheckout && (
                <button
                  type="button"
                  onClick={onNavigateToCheckout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  {t('profile.upgradePlan')}
                </button>
              )}
              {user?.plan_features?.cloud_save && (
                <button
                  type="button"
                  onClick={() => setShowCancelPlanConfirm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  {t('profile.cancelPlan')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelPlanConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('profile.cancelPlan')}</h3>
            <p className="text-slate-600 mb-6">{t('profile.cancelPlanConfirm')}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelPlanConfirm(false)}
                disabled={cancelPlanLoading}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCancelPlan}
                disabled={cancelPlanLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-70 flex items-center gap-2"
              >
                {cancelPlanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('profile.cancelPlan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-slate-500" />
            {t('profile.cloudSave')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('profile.cloudSaveDesc')}</p>
        </div>
        <div className="p-6">
          {preferencesLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">
                {canUseCloudSave ? t('profile.cloudSave') : t('profile.cloudSaveProOnly')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={cloudSaveEnabled}
                disabled={!canUseCloudSave || cloudSaveUpdating}
                onClick={handleCloudSaveToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  cloudSaveEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                } ${!canUseCloudSave ? 'opacity-60' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    cloudSaveEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-500" />
            {t('profile.profileInfo')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('profile.updateDetails')}</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
          {profileMessage && (
            <div
              ref={profileMessageRef}
              tabIndex={-1}
              role="alert"
              aria-live="polite"
              className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {profileMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              {profileMessage.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.emailAddress')}</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg outline-none cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">{t('profile.emailCannotChange')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.fullName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('auth.namePlaceholder')}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileLoading || !isProfileDirty}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.saveChanges')}
            </button>
          </div>
        </form>
      </div>

      {/* Email Change Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Mail className="w-5 h-5 text-slate-500" />
            {t('profile.changeEmail')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('profile.changeEmailDesc')}</p>
        </div>
        <form onSubmit={handleEmailChangeRequest} className="p-6 space-y-4">
          {emailChangeMessage && (
            <div
              role="alert"
              aria-live="polite"
              className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                emailChangeMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {emailChangeMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              {emailChangeMessage.text}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.newEmail')}</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.currentPassword')}</label>
            <input
              type="password"
              value={emailChangePassword}
              onChange={(e) => setEmailChangePassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={emailChangeLoading}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-70"
            >
              {emailChangeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.requestVerification')}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{t('profile.changePassword')}</h3>
          <p className="text-sm text-slate-500 mt-1">{t('profile.passwordSecurity')}</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
          {passwordMessage && (
            <div
              ref={passwordMessageRef}
              tabIndex={-1}
              role="alert"
              aria-live="polite"
              className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.currentPassword')}</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.newPassword')}</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {(['weak', 'fair', 'good', 'strong'] as const).map((level) => {
                    const levels: Array<'weak' | 'fair' | 'good' | 'strong'> = ['weak', 'fair', 'good', 'strong'];
                    const filled = levels.indexOf(passwordStrength) >= levels.indexOf(level);
                    const colors = {
                      weak: 'bg-red-400',
                      fair: 'bg-amber-400',
                      good: 'bg-lime-400',
                      strong: 'bg-emerald-500',
                    };
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${filled ? colors[passwordStrength] : 'bg-slate-200'}`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {t(`profile.password${passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}`)}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">{t('auth.passwordHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.confirmNewPassword')}</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-70"
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.updatePassword')}
            </button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-500" />
            {t('profile.twoFactorAuth')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('profile.twoFactorDesc')}</p>
        </div>
        <div className="p-6 space-y-4">
          {twoFAMessage && (
            <div
              role="alert"
              className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                twoFAMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {twoFAMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              {twoFAMessage.text}
            </div>
          )}
          {twoFAStatusLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : twoFASetupStep === 'qr' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{t('profile.scanQRCode')}</p>
              <img src={twoFAQRUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              <form onSubmit={handleVerify2FA} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.enterCodeToVerify')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button type="submit" disabled={twoFALoading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-70">
                  {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.verify2FA')}
                </button>
              </form>
            </div>
          ) : twoFASetupStep === 'backup' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{t('profile.twoFAEnabled')}</p>
              <p className="text-sm text-slate-600">{t('profile.backupCodesDesc')}</p>
              <div className="bg-slate-50 p-4 rounded-lg font-mono text-sm break-all">
                {twoFABackupCodes.map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setTwoFASetupStep('idle'); setTwoFABackupCodes([]); }}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {t('common.close')}
              </button>
            </div>
          ) : twoFAEnabled ? (
            <form onSubmit={handleDisable2FA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.currentPassword')}</label>
                <input
                  type="password"
                  value={disable2FAPassword}
                  onChange={(e) => setDisable2FAPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <button type="submit" disabled={twoFALoading} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-70">
                {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.disable2FA')}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleEnable2FA}
              disabled={twoFALoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-70"
            >
              {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.enable2FA')}
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {t('profile.deleteAccount')}
          </h3>
          <p className="text-sm text-red-600/80 mt-1">{t('profile.deleteAccountDesc')}</p>
        </div>
        <div className="p-6">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              {t('profile.deleteAccountButton')}
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {deleteError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.deleteAccountConfirm')}</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="DELETE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.currentPassword')}</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeletePassword(''); setDeleteError(null); }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-70"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.deleteAccountButton')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
