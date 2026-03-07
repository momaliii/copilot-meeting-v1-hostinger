import { useTranslation } from 'react-i18next';
import PublicLayout from '../components/PublicLayout';
import PricingSection from '../landing/PricingSection';

export default function PricingPage({ onGetStarted, onSelectPlan }: { onGetStarted: () => void; onSelectPlan?: (planId: string) => void }) {
  return (
    <PublicLayout>
      <div className="py-12">
        <PricingSection onGetStarted={onGetStarted} onSelectPlan={onSelectPlan} />
      </div>
    </PublicLayout>
  );
}
