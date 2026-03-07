import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Users, CheckSquare, Globe, CalendarPlus, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export default function FeaturesSection() {
  const { t } = useTranslation();
  const [activeFeature, setActiveFeature] = useState<number | null>(0);
  const features = [
    { icon: Mic, titleKey: 'landing.features.captureAnySource', descKey: 'landing.features.captureDesc', impactKey: 'landing.features.captureImpact' },
    { icon: Users, titleKey: 'landing.features.speakerTranscript', descKey: 'landing.features.speakerDesc', impactKey: 'landing.features.speakerImpact' },
    { icon: CheckSquare, titleKey: 'landing.features.actionItems', descKey: 'landing.features.actionDesc', impactKey: 'landing.features.actionImpact' },
    { icon: Globe, titleKey: 'landing.features.multiLanguage', descKey: 'landing.features.multiDesc', impactKey: 'landing.features.multiImpact' },
    { icon: CalendarPlus, titleKey: 'landing.features.calendarAttachment', descKey: 'landing.features.calendarDesc', impactKey: 'landing.features.calendarImpact' },
    { icon: Lock, titleKey: 'landing.features.consentFirst', descKey: 'landing.features.consentDesc', impactKey: 'landing.features.consentImpact' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

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
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-body">
            {t('landing.features.subtitle')}
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isActive = activeFeature === idx;
            return (
              <motion.button
                key={idx} 
                type="button"
                variants={itemVariants}
                onMouseEnter={() => setActiveFeature(idx)}
                onFocus={() => setActiveFeature(idx)}
                onClick={() => setActiveFeature(isActive ? null : idx)}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`text-left bg-white rounded-2xl p-8 border shadow-sm hover:shadow-xl transition-all cursor-pointer group ${
                  isActive ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-lg' : 'border-slate-200'
                }`}
              >
                <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                  <Icon className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t(feature.titleKey)}</h3>
                <p className="text-slate-600 leading-relaxed font-body">{t(feature.descKey)}</p>
                <p className={`text-sm mt-4 font-medium transition-opacity ${isActive ? 'text-indigo-700 opacity-100' : 'text-slate-400 opacity-75'}`}>
                  {t('landing.features.whyItMatters')}: {t(feature.impactKey)}
                </p>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
