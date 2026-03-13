import { useTranslation } from 'react-i18next';
import PublicLayout from '../components/PublicLayout';
import { usePageMeta } from '../hooks/usePageMeta';

export default function TermsPage() {
  const { t } = useTranslation();
  usePageMeta(
    'Terms of Service — Meeting Copilot',
    'Terms and conditions for using Meeting Copilot, the AI meeting assistant.'
  );

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 font-heading">{t('terms.title')}</h1>
        <p className="text-slate-600 mb-12 font-body">{t('terms.lastUpdated')}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('terms.acceptanceTitle')}</h2>
            <p className="text-slate-600 font-body">{t('terms.acceptanceDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('terms.serviceTitle')}</h2>
            <p className="text-slate-600 font-body">{t('terms.serviceDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('terms.obligationsTitle')}</h2>
            <p className="text-slate-600 font-body">{t('terms.obligationsDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('terms.limitationsTitle')}</h2>
            <p className="text-slate-600 font-body">{t('terms.limitationsDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('terms.terminationTitle')}</h2>
            <p className="text-slate-600 font-body">{t('terms.terminationDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('terms.contactTitle')}</h2>
            <p className="text-slate-600 font-body">{t('terms.contactDesc')}</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
