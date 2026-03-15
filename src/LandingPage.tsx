import Navbar from './landing/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import CTASection from './components/CTASection';
import Hero from './landing/Hero';
import SocialProof from './landing/SocialProof';
import HowItWorks from './landing/HowItWorks';
import FeaturesSection from './landing/FeaturesSection';
import PrivacySection from './landing/PrivacySection';
import PricingSection from './landing/PricingSection';
import FAQ from './landing/FAQ';
import Footer from './landing/Footer';

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
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

      <CTASection onGetStarted={onGetStarted} variant="gradient" />

      <Footer />
    </div>
  );
}
