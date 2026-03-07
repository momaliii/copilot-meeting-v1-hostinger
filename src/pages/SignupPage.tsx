import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

const WHERE_KNOW_OPTIONS = [
  { value: '', labelKey: 'auth.whereKnowUsSelect' },
  { value: 'google', labelKey: 'auth.whereKnowUsGoogle' },
  { value: 'friend', labelKey: 'auth.whereKnowUsFriend' },
  { value: 'social', labelKey: 'auth.whereKnowUsSocial' },
  { value: 'other', labelKey: 'auth.whereKnowUsOther' },
];

export default function SignupPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [whereKnowUs, setWhereKnowUs] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNav = (path: string) => () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          whereKnowUs: whereKnowUs || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Signup failed');

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2 font-heading">{t('auth.createAccount')}</h1>
        <p className="text-slate-600 mb-8 font-body">{t('pages.signupSubtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.firstName')}</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('auth.firstNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.lastName')}</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('auth.lastNamePlaceholder')}
              />
            </div>
          </div>

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
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('auth.phonePlaceholder')}
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
            <p className="text-xs text-slate-500 mt-1">{t('auth.passwordHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.whereKnowUs')}</label>
            <select
              value={whereKnowUs}
              onChange={(e) => setWhereKnowUs(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              {WHERE_KNOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.signUp')}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-600 font-body">
          {t('auth.alreadyHaveAccount')}{' '}
          <a href="/login" onClick={(e) => { e.preventDefault(); handleNav('/login')(); }} className="text-indigo-600 hover:text-indigo-700 font-medium">
            {t('auth.signIn')}
          </a>
        </p>
      </div>
    </PublicLayout>
  );
}
