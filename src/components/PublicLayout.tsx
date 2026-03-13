import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Download } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useBranding } from '../contexts/BrandingContext';

const PUBLIC_NAV = [
  { path: '/', labelKey: 'pages.home' },
  { path: '/pricing', labelKey: 'pages.pricing' },
  { path: '/about', labelKey: 'pages.about' },
  { path: '/contact', labelKey: 'pages.contact' },
  { path: '/privacy', labelKey: 'pages.privacy' },
  { path: '/terms', labelKey: 'pages.terms' },
];

export default function PublicLayout({ children, onGetStarted }: { children: React.ReactNode; onGetStarted?: () => void }) {
  const { t } = useTranslation();
  const { siteName, logoUrl } = useBranding();
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  const handleNav = (e: React.MouseEvent) => {
    const target = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
    if (target && target.startsWith('/') && !target.startsWith('//')) {
      e.preventDefault();
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 font-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" onClick={handleNav} className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-bold text-xl tracking-tight text-slate-900">{siteName}</span>
          </a>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              {PUBLIC_NAV.map((link) => (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={handleNav}
                  className={`text-sm font-medium hover:text-slate-900 transition-colors ${
                    path === link.path ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {t(link.labelKey)}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher variant="compact" />
              <a
                href="/chrome-extension.zip"
                download="chrome-extension.zip"
                className="hidden md:flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('landing.nav.getExtension')}
              </a>
              <a
                href="/login"
                onClick={handleNav}
                className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {t('auth.signIn')}
              </a>
              <a
                href="/signup"
                onClick={handleNav}
                className="hidden md:block bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('auth.signUp')}
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-7 h-7 rounded-lg object-contain" />
            ) : (
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Mic className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-bold text-lg tracking-tight text-slate-900 font-heading">{siteName}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" onClick={handleNav} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">
              {t('pages.privacy')}
            </a>
            <a href="/pricing" onClick={handleNav} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">
              {t('pages.pricing')}
            </a>
            <a href="/contact" onClick={handleNav} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">
              {t('pages.contact')}
            </a>
            <a href="/terms" onClick={handleNav} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">
              {t('pages.terms')}
            </a>
          </div>
          <div className="text-sm text-slate-500 font-body">{t('landing.footer.copyright', { siteName })}</div>
        </div>
      </footer>
    </div>
  );
}
