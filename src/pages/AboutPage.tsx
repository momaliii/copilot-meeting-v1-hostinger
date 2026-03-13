import { useTranslation } from 'react-i18next';
import { Mic, Users, Target, Zap } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { usePageMeta } from '../hooks/usePageMeta';

export default function AboutPage() {
  const { t } = useTranslation();
  usePageMeta(
    'About — Meeting Copilot',
    'Learn about Meeting Copilot, the AI-powered meeting assistant for transcription, summaries, and action items.'
  );

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6 font-heading">{t('about.title')}</h1>
        <p className="text-lg text-slate-600 mb-12 font-body">{t('about.subtitle')}</p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="bg-indigo-100 p-3 rounded-xl w-fit mb-4">
              <Mic className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2 font-heading">{t('about.missionTitle')}</h2>
            <p className="text-slate-600 font-body">{t('about.missionDesc')}</p>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="bg-indigo-100 p-3 rounded-xl w-fit mb-4">
              <Target className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2 font-heading">{t('about.visionTitle')}</h2>
            <p className="text-slate-600 font-body">{t('about.visionDesc')}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 font-heading">{t('about.whyUs')}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{t('about.aiPowered')}</h3>
                <p className="text-sm text-slate-600 font-body">{t('about.aiPoweredDesc')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{t('about.teamFirst')}</h3>
                <p className="text-sm text-slate-600 font-body">{t('about.teamFirstDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
