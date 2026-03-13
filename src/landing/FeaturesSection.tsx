import { useTranslation } from 'react-i18next';
import { Mic, Users, CheckSquare, Globe, CalendarPlus, Lock } from 'lucide-react';
import { motion } from 'motion/react';

const FEATURES = [
  { icon: Mic, titleKey: 'landing.features.captureAnySource', descKey: 'landing.features.captureDesc', large: true },
  { icon: Users, titleKey: 'landing.features.speakerTranscript', descKey: 'landing.features.speakerDesc', large: true },
  { icon: CheckSquare, titleKey: 'landing.features.actionItems', descKey: 'landing.features.actionDesc', large: false },
  { icon: Globe, titleKey: 'landing.features.multiLanguage', descKey: 'landing.features.multiDesc', large: false },
  { icon: CalendarPlus, titleKey: 'landing.features.calendarAttachment', descKey: 'landing.features.calendarDesc', large: false },
  { icon: Lock, titleKey: 'landing.features.consentFirst', descKey: 'landing.features.consentDesc', large: false },
];

export default function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-24 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.features.title')}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-body">{t('landing.features.subtitle')}</p>
        </motion.div>

        {/* Bento grid: 2 large cards on top, 4 small below */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const isLarge = feature.large;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  isLarge ? 'lg:col-span-2 p-8' : 'p-6'
                }`}
              >
                {/* Gradient hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/50 group-hover:to-violet-50/30 transition-all duration-500 rounded-2xl" />

                <div className="relative z-10">
                  <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 transition-colors duration-300 group-hover:scale-110 transform">
                    <Icon className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className={`font-semibold text-slate-900 mb-2 font-heading ${isLarge ? 'text-xl' : 'text-lg'}`}>
                    {t(feature.titleKey)}
                  </h3>
                  <p className={`text-slate-600 leading-relaxed font-body ${isLarge ? 'text-base' : 'text-sm'}`}>
                    {t(feature.descKey)}
                  </p>
                  <a
                    href="#preview"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    {t('landing.features.seeItInAction')} →
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
