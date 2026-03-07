import { useTranslation } from 'react-i18next';
import { Mic, Zap } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 font-heading">Meeting Copilot</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-body">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            {t('landing.footer.poweredBy')}
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="/privacy" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">{t('landing.footer.privacy')}</a>
          <a href="/pricing" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/pricing'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">{t('landing.footer.pricing')}</a>
          <a href="/contact" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/contact'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">{t('landing.footer.contact')}</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 font-body">{t('pages.terms')}</a>
        </div>
        
        <div className="text-sm text-slate-500 font-body">
          {t('landing.footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
