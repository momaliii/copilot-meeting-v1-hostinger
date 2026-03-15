import AnnouncementBar from '../components/AnnouncementBar';
import CTASection from '../components/CTASection';
import PublicLayout from '../components/PublicLayout';
import Hero from '../landing/Hero';
import FeaturesSection from '../landing/FeaturesSection';
import PricingSection from '../landing/PricingSection';
import { usePageMeta } from '../hooks/usePageMeta';

export default function HomePage({ onGetStarted, onSelectPlan }: { onGetStarted: () => void; onSelectPlan?: (planId: string) => void }) {
  usePageMeta(
    'Meeting Copilot — AI Meeting Notes, Transcripts & Action Items',
    'Record, transcribe, and analyze meetings with AI. Get summaries, action items, and follow-up emails. Start free.'
  );

  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" aria-hidden="true" />
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" aria-hidden="true" />
        <AnnouncementBar context="public" />
        <Hero onGetStarted={onGetStarted} />
        <FeaturesSection />
        <PricingSection onGetStarted={onGetStarted} onSelectPlan={onSelectPlan} />
        <CTASection onGetStarted={onGetStarted} variant="gradient" />
      </div>
    </PublicLayout>
  );
}
