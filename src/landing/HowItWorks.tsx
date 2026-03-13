import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Sparkles, CalendarPlus, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const STEPS = [
  { id: 0, icon: Mic, color: 'indigo', titleKey: 'landing.how.record', descKey: 'landing.how.recordDesc', mockKey: 'landing.how.recordMock' },
  { id: 1, icon: Sparkles, color: 'violet', titleKey: 'landing.how.analyze', descKey: 'landing.how.analyzeDesc', mockKey: 'landing.how.analyzeMock' },
  { id: 2, icon: CalendarPlus, color: 'emerald', titleKey: 'landing.how.share', descKey: 'landing.how.shareDesc', mockKey: 'landing.how.shareMock' },
] as const;

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', badge: 'bg-indigo-600', border: 'border-indigo-200', fill: 'bg-indigo-600' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', badge: 'bg-violet-600', border: 'border-violet-200', fill: 'bg-violet-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-600', border: 'border-emerald-200', fill: 'bg-emerald-600' },
};

export default function HowItWorks({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionHeight = rect.height;
      const viewportCenter = window.innerHeight / 2;
      const scrolled = viewportCenter - rect.top;
      const pct = Math.max(0, Math.min(1, scrolled / sectionHeight));
      setProgress(pct);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={sectionRef} id="how" className="py-24 bg-white border-y border-slate-200 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.how.title')}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-body">{t('landing.how.subtitle')}</p>
        </motion.div>

        {/* Desktop: Vertical timeline */}
        <div className="hidden md:block relative mb-16">
          {/* Timeline line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-slate-200">
            <div
              className="w-full bg-gradient-to-b from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-100 ease-out rounded-full"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          <div className="space-y-20">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const colors = COLOR_MAP[step.color];
              const isLeft = step.id % 2 === 0;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, delay: step.id * 0.15 }}
                  className="relative grid grid-cols-[1fr_60px_1fr] items-center gap-6"
                >
                  {/* Content side */}
                  <div className={isLeft ? 'text-right pr-4' : 'col-start-3 text-left pl-4'}>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 font-heading">{t(step.titleKey)}</h3>
                    <p className="text-slate-600 leading-relaxed font-body max-w-md inline-block">{t(step.descKey)}</p>
                  </div>

                  {/* Center badge */}
                  <div className={`col-start-2 flex justify-center ${isLeft ? '' : 'row-start-1'}`}>
                    <div className={`relative w-14 h-14 rounded-full ${colors.badge} text-white flex items-center justify-center font-bold text-xl shadow-lg ring-4 ring-white z-10`}>
                      {step.id + 1}
                    </div>
                  </div>

                  {/* Illustration side */}
                  <div className={isLeft ? 'col-start-3 pl-4' : 'col-start-1 row-start-1 pr-4'}>
                    <div className={`${colors.bg} rounded-2xl p-6 border ${colors.border}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                        <span className={`text-sm font-semibold ${colors.text}`}>{t(step.titleKey)}</span>
                      </div>
                      <div className="text-sm text-slate-500 font-body">{t(step.mockKey)}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Stacked cards with left line */}
        <div className="md:hidden relative mb-12">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-8 pl-14">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const colors = COLOR_MAP[step.color];

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: step.id * 0.1 }}
                  className="relative"
                >
                  <div className={`absolute -left-[calc(3.5rem-0.25rem)] top-0 w-10 h-10 rounded-full ${colors.badge} text-white flex items-center justify-center font-bold text-lg shadow-md ring-4 ring-white z-10`}>
                    {step.id + 1}
                  </div>

                  <div className={`${colors.bg} rounded-2xl p-5 border ${colors.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                      <h3 className="text-lg font-bold text-slate-900 font-heading">{t(step.titleKey)}</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-body">{t(step.descKey)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t('landing.how.startFree')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
