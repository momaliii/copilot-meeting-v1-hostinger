import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import AnnouncementBar from '../components/AnnouncementBar';
import PublicLayout from '../components/PublicLayout';
import Hero from '../landing/Hero';
import FeaturesSection from '../landing/FeaturesSection';
import PricingSection from '../landing/PricingSection';

export default function HomePage({ onGetStarted, onSelectPlan }: { onGetStarted: () => void; onSelectPlan?: (planId: string) => void }) {
  const { t } = useTranslation();

  const handleNav = (path: string) => () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" aria-hidden="true" />
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" aria-hidden="true" />
        <AnnouncementBar context="public" />
        <Hero onGetStarted={onGetStarted} />
        <FeaturesSection />
        <PricingSection onGetStarted={onGetStarted} onSelectPlan={onSelectPlan} />
        <section className="py-20 bg-white border-y border-slate-200">
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
                href="/pricing"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/pricing')();
                }}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
              >
                {t('pages.pricing')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
