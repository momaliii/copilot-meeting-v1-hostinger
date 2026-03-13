import { useTranslation } from 'react-i18next';
import PublicLayout from '../components/PublicLayout';
import { usePageMeta } from '../hooks/usePageMeta';

export default function PrivacyPage() {
  const { t } = useTranslation();
  usePageMeta(
    'Privacy Policy — Meeting Copilot',
    'How Meeting Copilot handles your data and privacy. Audio is never uploaded without your explicit consent.'
  );

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 font-heading">{t('privacy.title')}</h1>
        <p className="text-slate-600 mb-12 font-body">{t('privacy.lastUpdated')}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('privacy.collectionTitle')}</h2>
            <p className="text-slate-600 font-body">{t('privacy.collectionDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('privacy.usageTitle')}</h2>
            <p className="text-slate-600 font-body">{t('privacy.usageDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('privacy.storageTitle')}</h2>
            <p className="text-slate-600 font-body">{t('privacy.storageDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('privacy.cookiesTitle')}</h2>
            <p className="text-slate-600 font-body">{t('privacy.cookiesDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('privacy.rightsTitle')}</h2>
            <p className="text-slate-600 font-body">{t('privacy.rightsDesc')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t('privacy.contactTitle')}</h2>
            <p className="text-slate-600 font-body">{t('privacy.contactDesc')}</p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
