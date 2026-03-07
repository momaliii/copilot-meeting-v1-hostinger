import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Sparkles, CalendarPlus } from 'lucide-react';
import { motion } from 'motion/react';

export default function HowItWorks({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    { id: 0, icon: Mic, color: 'indigo', titleKey: 'landing.how.record', descKey: 'landing.how.recordDesc' },
    { id: 1, icon: Sparkles, color: 'violet', titleKey: 'landing.how.analyze', descKey: 'landing.how.analyzeDesc' },
    { id: 2, icon: CalendarPlus, color: 'emerald', titleKey: 'landing.how.share', descKey: 'landing.how.shareDesc' }
  ] as const;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
  };

  return (
    <section id="how" className="py-24 bg-white border-y border-slate-200 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.how.title')}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-body">
            {t('landing.how.subtitle')}
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8 mb-16 relative"
        >
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-indigo-200 via-violet-200 to-emerald-200" />
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <motion.button
                key={step.id}
                type="button"
                variants={itemVariants}
                onMouseEnter={() => setActiveStep(step.id)}
                onFocus={() => setActiveStep(step.id)}
                className={`relative text-left bg-slate-50 rounded-3xl p-8 border transition-all duration-300 ${
                  isActive
                    ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-100'
                    : 'border-slate-100 hover:shadow-lg'
                }`}
              >
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-4 border-white">
                  {step.id + 1}
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                  step.color === 'indigo'
                    ? 'bg-indigo-100'
                    : step.color === 'violet'
                      ? 'bg-violet-100'
                      : 'bg-emerald-100'
                }`}>
                  <Icon className={`w-7 h-7 ${
                    step.color === 'indigo'
                      ? 'text-indigo-600'
                      : step.color === 'violet'
                        ? 'text-violet-600'
                        : 'text-emerald-600'
                  }`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3 font-heading">{t(step.titleKey)}</h3>
                <p className="text-slate-600 leading-relaxed font-body">
                  {t(step.descKey)}
                </p>
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <button 
            onClick={onGetStarted}
            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-indigo-600/20 hover:scale-105"
          >
            {t('landing.how.startFree')}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
