import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, ChevronRight, Mic, Lock, CircleCheck, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TYPING_PHRASES = [
  'landing.hero.titleHighlight',
  'landing.hero.typingPhrase2',
  'landing.hero.typingPhrase3',
];

export default function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation();
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-16 pb-16 sm:pt-20 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-200/30 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/20 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl lg:max-w-xl font-heading"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 text-indigo-700 text-sm font-medium mb-5 border border-indigo-100 backdrop-blur-sm">
              <Zap className="w-4 h-4" />
              {t('landing.hero.poweredBy')}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-2 leading-tight">
              {t('landing.hero.title')}
            </h1>

            <div className="h-[1.3em] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={phraseIndex}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.4 }}
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700"
                >
                  {t(TYPING_PHRASES[phraseIndex])}
                </motion.span>
              </AnimatePresence>
            </div>

            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-8 leading-relaxed font-body">
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
              <button
                onClick={onGetStarted}
                className="relative w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('landing.hero.startFree')}
                <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="#preview"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 border border-slate-200 px-7 py-3.5 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-sm"
              >
                <Play className="w-4 h-4 text-indigo-500" />
                {t('landing.hero.watchDemo')}
              </a>
            </div>
            <p className="text-xs text-slate-500 mb-8 font-body">{t('landing.hero.noCreditCard')}</p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white/70 backdrop-blur-sm border border-slate-200/80 px-3 py-1.5 rounded-full shadow-sm">
                <Mic className="w-4 h-4 text-indigo-500" />
                {t('landing.hero.micTabBoth')}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white/70 backdrop-blur-sm border border-slate-200/80 px-3 py-1.5 rounded-full shadow-sm">
                <Lock className="w-4 h-4 text-emerald-500" />
                {t('landing.hero.consentFirst')}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white/70 backdrop-blur-sm border border-slate-200/80 px-3 py-1.5 rounded-full shadow-sm">
                <CircleCheck className="w-4 h-4 text-violet-500" />
                {t('landing.hero.shareReadyNotes')}
              </div>
            </div>

            {/* Logo trust bar */}
            <div className="mt-10 pt-8 border-t border-slate-200/60">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4 font-body">{t('landing.hero.trustedBy')}</p>
              <div className="flex flex-wrap items-center gap-6 opacity-40">
                {['Acme Corp', 'TechStart', 'DataFlow', 'CloudSync'].map((name) => (
                  <span key={name} className="text-sm font-bold text-slate-500 tracking-wide">{name}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Demo Preview */}
          <motion.div
            id="preview"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:pl-4 scroll-mt-24"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-100/50 via-transparent to-violet-100/50 rounded-3xl blur-2xl" aria-hidden="true" />
              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
                {/* App mockup header */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white rounded-md px-3 py-0.5 text-xs text-slate-400 border border-slate-200">meeting-copilot.app</div>
                  </div>
                </div>
                {/* Auto-playing flow animation */}
                <DemoFlow />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DemoFlow() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: t('landing.hero.demoRecord'), icon: '🎙️', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: t('landing.hero.demoAnalyze'), icon: '⚡', color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { label: t('landing.hero.demoResults'), icon: '📋', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  return (
    <div className="p-6 sm:p-8 min-h-[280px] flex flex-col justify-center">
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${i === step ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/30' : i < step ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 transition-colors duration-500 ${i < step ? 'bg-indigo-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className={`text-center p-6 rounded-xl border ${steps[step].color}`}
        >
          <div className="text-3xl mb-3">{steps[step].icon}</div>
          <div className="font-semibold text-lg">{steps[step].label}</div>
        </motion.div>
      </AnimatePresence>

      {/* Simulated output preview */}
      <AnimatePresence>
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {[t('landing.hero.demoSummary'), t('landing.hero.demoActions'), t('landing.hero.demoDecisions')].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2"
              >
                <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                {item}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
