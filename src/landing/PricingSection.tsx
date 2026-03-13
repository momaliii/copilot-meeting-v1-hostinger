import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

type PricingSectionProps = {
  onGetStarted: () => void;
  onSelectPlan?: (planId: string) => void;
};

export default function PricingSection({ onGetStarted, onSelectPlan }: PricingSectionProps) {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<any[]>([]);
  const [featureLabels, setFeatureLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPlans = async () => {
      try {
        setError(false);
        // Try feature matrix API first, fallback to legacy
        const featRes = await fetch('/api/public/plans/features', { signal: controller.signal });
        if (featRes.ok) {
          const data = await featRes.json();
          setPlans(data.plans || []);
          setFeatureLabels(data.featureLabels || {});
        } else {
          const res = await fetch('/api/public/plans', { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            setPlans((Array.isArray(data) ? data : []).map((p: any) => ({
              id: p.id, name: p.name, price: p.price,
              features: {
                minutesLimit: p.minutes_limit,
                languageChanges: p.language_changes_limit ?? -1,
                videoCaption: !!(p.video_caption),
                cloudSave: !!(p.cloud_save),
                proAnalysis: !!(p.pro_analysis_enabled),
              },
            })));
          } else {
            setError(true);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch plans', err);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
    return () => controller.abort();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="pricing" className="py-24 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.pricing.title')}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-body">
            {t('landing.pricing.subtitle')}
          </p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-pulse">
                <div className="h-7 bg-slate-200 rounded-lg w-24 mb-4" />
                <div className="h-12 bg-slate-200 rounded-lg w-20 mb-6" />
                <div className="space-y-4 mb-8">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-[80%]" />
                  <div className="h-4 bg-slate-100 rounded w-[75%]" />
                </div>
                <div className="h-12 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : error || plans.length === 0 ? (
          <div className="text-center max-w-md mx-auto">
            <p className="text-slate-600 mb-6 font-body">
              {t('landing.pricing.loadError')}
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-600/20"
            >
              {t('landing.hero.startFree')}
            </button>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {plans.map((plan, index) => {
              const isPopular = index === 1;
              const feat = plan.features || {};
              const minutesLimit = feat.minutesLimit ?? plan.minutes_limit ?? 0;
              const hasVideo = feat.videoCaption ?? !!(plan.video_caption);
              const hasCloudSave = feat.cloudSave ?? !!(plan.cloud_save);
              const hasProAnalysis = feat.proAnalysis ?? !!(plan.pro_analysis_enabled);
              const langChanges = feat.languageChanges ?? plan.language_changes_limit ?? -1;

              return (
                <motion.div 
                  key={plan.id} 
                  variants={itemVariants}
                  whileHover={{ y: isPopular ? -20 : -5 }}
                  className={`${isPopular ? 'bg-slate-900 border-slate-800 shadow-2xl text-white md:-translate-y-4' : 'bg-white border-slate-200 shadow-sm text-slate-900 hover:shadow-lg'} rounded-3xl p-8 border flex flex-col relative transition-all duration-300`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md">
                      {t('landing.pricing.mostPopular')}
                    </div>
                  )}
                  <h3 className={`text-2xl font-semibold mb-2 ${isPopular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={`text-5xl font-bold ${isPopular ? 'text-white' : 'text-slate-900'}`}>${plan.price}</span>
                    <span className={isPopular ? 'text-slate-400' : 'text-slate-500'}>{t('landing.pricing.perMonth')}</span>
                  </div>
                  <ul className={`space-y-4 mb-8 flex-1 ${isPopular ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li className="flex items-start gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isPopular ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                      <span>{t('landing.pricing.monthlyMinutes', { count: minutesLimit })}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isPopular ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                      <span>{t('landing.pricing.transcriptsSummary')}</span>
                    </li>
                    {hasVideo && (
                      <li className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isPopular ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                        <span>{t('landing.pricing.videoCaption')}</span>
                      </li>
                    )}
                    {hasCloudSave && (
                      <li className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isPopular ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                        <span>{featureLabels.cloudSave || 'Cloud Save'}</span>
                      </li>
                    )}
                    {hasProAnalysis && (
                      <li className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isPopular ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                        <span>{t('landing.pricing.advancedInsights')}</span>
                      </li>
                    )}
                    {langChanges === -1 && (
                      <li className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isPopular ? 'bg-indigo-400' : 'bg-indigo-500'}`}></div>
                        <span>{featureLabels.languageChanges ? `${featureLabels.languageChanges}: Unlimited` : 'Unlimited Translations'}</span>
                      </li>
                    )}
                  </ul>
                  <button 
                    onClick={() => {
                      if (plan.price > 0 && onSelectPlan) {
                        onSelectPlan(plan.id);
                      } else {
                        onGetStarted();
                      }
                    }}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${isPopular ? 'bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/25' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                  >
                    {plan.price === 0 ? t('landing.pricing.startRecording') : t('landing.pricing.startUpgrade')}
                  </button>
                </motion.div>
              );
            })}

            {/* Team (Coming soon) */}
            <motion.div 
              variants={itemVariants}
              className="bg-slate-50/50 rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col relative opacity-80"
            >
              <div className="absolute top-4 right-4 bg-white text-slate-500 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full border border-slate-200 shadow-sm">
                {t('landing.pricing.comingSoon')}
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">{t('landing.pricing.team')}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold text-slate-400">$—</span>
                <span className="text-slate-400">{t('landing.pricing.perMonth')}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-slate-500">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0"></div>
                  <span>{t('landing.pricing.workspaceInvites')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0"></div>
                  <span>{t('landing.pricing.roleBasedAccess')}</span>
                </li>
              </ul>
              <a 
                href="#faq"
                className="w-full py-3.5 rounded-xl font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-center block"
              >
                {t('landing.pricing.learnMore')}
              </a>
            </motion.div>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-slate-500 mb-4">
            {t('landing.pricing.planLimits')}
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm"
          >
            {t('landing.pricing.startFreeSeconds')}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
