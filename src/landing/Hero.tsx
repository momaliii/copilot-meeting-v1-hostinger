import { useTranslation } from 'react-i18next';
import { Zap, ChevronRight, Mic, Lock, CircleCheck } from 'lucide-react';
import { motion } from 'motion/react';
import ScreenshotMock from './ScreenshotMock';

export default function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="pt-14 pb-12 sm:pt-16 sm:pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
        {/* Left Column */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl lg:max-w-xl font-heading"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4 border border-indigo-100">
            <Zap className="w-4 h-4" />
            {t('landing.hero.poweredBy')}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-5 leading-tight">
            {t('landing.hero.title')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700">{t('landing.hero.titleHighlight')}</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-7 leading-relaxed font-body">
            {t('landing.hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-3">
            <div className="relative">
              <button 
                onClick={onGetStarted}
                className="relative w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/30 hover:scale-[1.02]"
              >
                {t('landing.hero.startFree')}
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="absolute -bottom-5 left-0 right-0 sm:left-auto sm:right-0 text-center sm:text-left text-xs text-slate-500">{t('landing.hero.noCreditCard')}</span>
            </div>
            <a 
              href="#preview"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-7 py-3.5 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-sm"
            >
              {t('landing.hero.previewOutputs')}
            </a>
          </div>

          <p className="text-sm text-slate-500 mb-2 mt-6 font-body">
            {t('landing.hero.lovedBy')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <Mic className="w-4 h-4 text-indigo-500" />
              {t('landing.hero.micTabBoth')}
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <Lock className="w-4 h-4 text-emerald-500" />
              {t('landing.hero.consentFirst')}
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <CircleCheck className="w-4 h-4 text-violet-500" />
              {t('landing.hero.shareReadyNotes')}
            </div>
          </div>
        </motion.div>

        {/* Right Column */}
        <motion.div 
          id="preview"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:pl-8 scroll-mt-24"
        >
          <ScreenshotMock />
        </motion.div>
      </div>
    </section>
  );
}
