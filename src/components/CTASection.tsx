import { useTranslation } from 'react-i18next';
import { ChevronRight, Play } from 'lucide-react';

type CTASectionProps = {
  onGetStarted: () => void;
  variant?: 'gradient' | 'minimal';
};

export default function CTASection({ onGetStarted, variant = 'gradient' }: CTASectionProps) {
  const { t } = useTranslation();

  if (variant === 'minimal') {
    return (
      <section className="py-20 sm:py-24 lg:py-28 bg-white border-y border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 font-heading">{t('landing.cta.title')}</h2>
          <p className="text-slate-600 mb-8 font-body">{t('landing.cta.subtitle')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] font-heading"
            >
              {t('landing.cta.startFree')}
              <ChevronRight className="w-5 h-5" />
            </button>
            <a
              href="#preview"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
            >
              <Play className="w-5 h-5 text-indigo-500" />
              {t('landing.cta.watchDemo')}
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-20 sm:py-24 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700" />
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-violet-300 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-heading">{t('landing.cta.title')}</h2>
        <p className="text-indigo-100 mb-8 text-lg font-body">{t('landing.cta.subtitle')}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] font-heading"
          >
            {t('landing.cta.startFree')}
            <ChevronRight className="w-5 h-5" />
          </button>
          <a
            href="#preview"
            className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-xl text-lg font-semibold transition-all font-heading"
          >
            <Play className="w-5 h-5" />
            {t('landing.cta.watchDemo')}
          </a>
        </div>
      </div>
    </section>
  );
}
