import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleNav = (path: string) => () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (requires2FA) {
        const res = await fetch('/api/auth/verify-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken, code: twoFactorCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid code');
        login(data.user, data.token, data.permissions || null);
        window.history.replaceState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (data.requires2FA && data.tempToken) {
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setTwoFactorCode('');
        setLoading(false);
        return;
      }

      login(data.user, data.token, data.permissions || null);
      const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/dashboard';
      window.history.replaceState({}, '', returnTo);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 font-heading">{t('auth.signIn')}</h1>
        <p className="text-slate-600 mb-8 font-body">{t('pages.loginSubtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{error}</div>
          )}

          {requires2FA ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.enter2FACode')}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center text-lg tracking-widest"
                placeholder="000000"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.password')}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (requires2FA ? t('profile.verifyAndSignIn') : t('auth.signIn'))}
          </button>
        </form>

        {!requires2FA && (
          <p className="mt-6 text-center text-slate-600 font-body">
            {t('auth.dontHaveAccount')}{' '}
            <a href="/signup" onClick={(e) => { e.preventDefault(); handleNav('/signup')(); }} className="text-indigo-600 hover:text-indigo-700 font-medium">
              {t('auth.signUp')}
            </a>
          </p>
        )}
      </div>
    </PublicLayout>
  );
}
