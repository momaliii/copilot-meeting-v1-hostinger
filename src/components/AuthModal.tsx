import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { X, Loader2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { login } = useAuth();

  if (!isOpen) return null;

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
        onClose();
        setRequires2FA(false);
        setTempToken('');
        setTwoFactorCode('');
        return;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin ? { email, password } : { email, password, name };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.requires2FA && data.tempToken) {
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setTwoFactorCode('');
        setError('');
        setLoading(false);
        return;
      }

      login(data.user, data.token, data.permissions || null);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-800">
            {requires2FA ? t('profile.verifyAndSignIn') : isLogin ? t('auth.signIn') : t('auth.createAccount')}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center text-lg tracking-widest"
                placeholder="000000"
                required
              />
            </div>
          ) : (
            <>
          {!isLogin && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">{t('auth.name')}</label>
              <input 
                id="auth-name"
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('auth.namePlaceholder')}
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email')}</label>
            <input 
              id="auth-email"
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>
          
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">{t('auth.password')}</label>
            <input 
              id="auth-password"
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('auth.passwordPlaceholder')}
            />
            {!isLogin && (
              <p className="text-xs text-slate-500 mt-1">
                {t('auth.passwordHint')}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (requires2FA ? t('profile.verifyAndSignIn') : isLogin ? t('auth.signIn') : t('auth.signUp'))}
          </button>

          {!requires2FA && (
          <div className="text-center mt-4">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {isLogin ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}
            </button>
          </div>
          )}
            </>
          )}

          {requires2FA && (
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('profile.verifyAndSignIn')}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
