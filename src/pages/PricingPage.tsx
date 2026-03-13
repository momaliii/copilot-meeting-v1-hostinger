import { useTranslation } from 'react-i18next';
import PublicLayout from '../components/PublicLayout';
import PricingSection from '../landing/PricingSection';
import { usePageMeta } from '../hooks/usePageMeta';

export default function PricingPage({ onGetStarted, onSelectPlan }: { onGetStarted: () => void; onSelectPlan?: (planId: string) => void }) {
  usePageMeta(
    'Pricing — Meeting Copilot',
    'Free and Pro plans for AI meeting transcription. Start free, upgrade for cloud save and advanced analysis.'
  );
  return (
    <PublicLayout>
      <div className="py-12">
        <PricingSection onGetStarted={onGetStarted} onSelectPlan={onSelectPlan} />
      </div>
    </PublicLayout>
  );
}
