import { useTranslation } from 'react-i18next';
import { AlertTriangle, MessageCircle, X } from 'lucide-react';

type Props = {
  previousPlan: string;
  onContactSupport: () => void;
  onDismiss: () => void;
};

export default function PlanDowngradePopup({ previousPlan, onContactSupport, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {t('downgrade.title')}
          </h2>

          <p className="text-slate-600 mb-6 leading-relaxed">
            {t('downgrade.message', { plan: previousPlan })}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => { onContactSupport(); onDismiss(); }}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              {t('downgrade.contactSupport')}
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 px-5 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {t('downgrade.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
