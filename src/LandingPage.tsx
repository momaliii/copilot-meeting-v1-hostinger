import { useTranslation } from 'react-i18next';
import { ChevronRight, Play } from 'lucide-react';
import Navbar from './landing/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import Hero from './landing/Hero';
import SocialProof from './landing/SocialProof';
import HowItWorks from './landing/HowItWorks';
import FeaturesSection from './landing/FeaturesSection';
import PrivacySection from './landing/PrivacySection';
import PricingSection from './landing/PricingSection';
import FAQ from './landing/FAQ';
import Footer from './landing/Footer';

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50 font-body selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" aria-hidden="true" />
      <AnnouncementBar context="public" />
      <Navbar onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      <SocialProof />
      <HowItWorks onGetStarted={onGetStarted} />
      <FeaturesSection />
      <PrivacySection />
      <PricingSection onGetStarted={onGetStarted} />
      <FAQ />

      {/* CTA - Gradient banner */}
      <section className="relative py-20 overflow-hidden">
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

      <Footer />
    </div>
  );
}
