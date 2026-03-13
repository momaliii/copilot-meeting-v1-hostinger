import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Mic, Zap, Globe } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

function navLink(href: string) {
  return {
    href,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
  };
}

export default function Footer() {
  const { t } = useTranslation();
  const { siteName, logoUrl } = useBranding();

  const toggleLang = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
    localStorage.setItem('lang', newLang);
  };

  const columns = [
    {
      title: t('landing.footer.product'),
      links: [
        { label: t('landing.nav.features'), ...navLink('/#features') },
        { label: t('landing.nav.pricing'), ...navLink('/pricing') },
        { label: t('landing.nav.howItWorks'), ...navLink('/#how') },
      ],
    },
    {
      title: t('landing.footer.company'),
      links: [
        { label: t('landing.footer.about'), ...navLink('/about') },
        { label: t('landing.footer.contact'), ...navLink('/contact') },
      ],
    },
    {
      title: t('landing.footer.resources'),
      links: [
        { label: t('landing.nav.faq'), ...navLink('/#faq') },
        { label: t('landing.footer.privacy'), ...navLink('/privacy') },
      ],
    },
    {
      title: t('landing.footer.legal'),
      links: [
        { label: t('pages.terms'), ...navLink('/terms') },
        { label: t('landing.footer.privacy'), ...navLink('/privacy') },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="w-7 h-7 rounded-lg object-contain" />
              ) : (
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                  <Mic className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="font-bold text-lg tracking-tight text-white font-heading">{siteName}</span>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed font-body">
              {t('landing.footer.tagline')}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-body">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              {t('landing.footer.poweredBy')}
            </span>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4 font-heading">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a {...link} className="text-sm text-slate-400 hover:text-white transition-colors font-body">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 font-body">
            {t('landing.footer.copyright', { siteName })}
          </div>

          <div className="flex items-center gap-4">
            {/* Social links */}
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
            </a>

            {/* Language switcher */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors border border-slate-700 rounded-lg px-3 py-1.5 hover:border-slate-600"
            >
              <Globe className="w-4 h-4" />
              {i18n.language === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
