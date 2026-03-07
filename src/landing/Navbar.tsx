import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Download, Menu, X } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const NAV_LINKS = [
  { href: '#how', id: 'how', labelKey: 'landing.nav.howItWorks' },
  { href: '#features', id: 'features', labelKey: 'landing.nav.features' },
  { href: '/pricing', id: null, labelKey: 'landing.nav.pricing' },
  { href: '/privacy', id: null, labelKey: 'landing.nav.privacy' },
  { href: '#faq', id: 'faq', labelKey: 'landing.nav.faq' }
];

export default function Navbar({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('features');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateActiveSection = () => {
      const sections = NAV_LINKS
        .filter((link) => link.id)
        .map((link) => document.getElementById(link.id!))
        .filter((section): section is HTMLElement => Boolean(section));

      const scrollY = window.scrollY + 120;
      let current = NAV_LINKS[0]?.id || 'features';

      for (const section of sections) {
        if (scrollY >= section.offsetTop) {
          const link = NAV_LINKS.find((l) => l.id === section.id);
          if (link) current = link.id!;
        }
      }

      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    closeMobileMenu();
    const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault();
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 font-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Meeting Copilot</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={link.href.startsWith('/') ? handleNavClick : undefined}
                className={`text-sm font-medium hover:text-slate-900 transition-colors ${
                  link.id && activeSection === link.id ? 'text-slate-900' : 'text-slate-600'
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
            <button 
              onClick={onGetStarted}
              className="hidden md:block bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {t('landing.nav.startFree')}
            </button>
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')}
                aria-expanded={mobileMenuOpen}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {mobileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 py-3 bg-white rounded-xl shadow-lg border border-slate-200">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={handleNavClick}
                      className={`block px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors ${
                        link.id && activeSection === link.id ? 'text-slate-900 bg-slate-50' : 'text-slate-600'
                      }`}
                    >
                      {t(link.labelKey)}
                    </a>
                  ))}
                  <div className="border-t border-slate-100 mt-2 pt-2 px-4 space-y-2">
                    <a
                      href="/chrome-extension.zip"
                      download="chrome-extension.zip"
                      onClick={handleNavClick}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 py-2"
                    >
                      <Download className="w-4 h-4" />
                      {t('landing.nav.getExtension')}
                    </a>
                    <button
                      onClick={() => { closeMobileMenu(); onGetStarted(); }}
                      className="w-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {t('landing.nav.startFree')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
