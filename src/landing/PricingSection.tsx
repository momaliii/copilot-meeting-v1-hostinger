import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Shield, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isYearly, setIsYearly] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPlans = async () => {
      try {
        setError(false);
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

  const getPrice = (basePrice: number) => {
    if (basePrice === 0) return 0;
    return isYearly ? Math.round(basePrice * 10) : basePrice;
  };

  const getPriceLabel = (basePrice: number) => {
    if (basePrice === 0) return '$0';
    const price = getPrice(basePrice);
    return isYearly ? `$${price}` : `$${price}`;
  };

  return (
    <section id="pricing" className="py-24 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.pricing.title')}</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-body mb-8">{t('landing.pricing.subtitle')}</p>

          {/* Monthly/Yearly toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!isYearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('landing.pricing.monthly')}
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all relative ${isYearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('landing.pricing.yearly')}
              {isYearly && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {t('landing.pricing.savePercent')}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
            <p className="text-slate-600 mb-6 font-body">{t('landing.pricing.loadError')}</p>
            <button onClick={onGetStarted} className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-600/20">
              {t('landing.hero.startFree')}
            </button>
          </div>
        ) : (
          <>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
              className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8"
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
                    variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                    whileHover={{ y: isPopular ? -12 : -4 }}
                    className={`relative rounded-3xl p-7 border flex flex-col transition-all duration-300 ${
                      isPopular
                        ? 'bg-slate-900 border-slate-700 text-white shadow-2xl md:-translate-y-4'
                        : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-lg'
                    }`}
                  >
                    {/* Glow effect for popular plan */}
                    {isPopular && (
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-3xl -z-10 blur-sm opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
                    )}

                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                        {t('landing.pricing.mostPopular')}
                      </div>
                    )}

                    <h3 className={`text-xl font-semibold mb-1 ${isPopular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                        {getPriceLabel(plan.price)}
                      </span>
                      <span className={`text-sm ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                        /{isYearly ? t('landing.pricing.year') : t('landing.pricing.mo')}
                      </span>
                    </div>

                    <ul className={`space-y-3 mb-8 flex-1 ${isPopular ? 'text-slate-300' : 'text-slate-600'}`}>
                      <FeatureRow check text={t('landing.pricing.monthlyMinutes', { count: minutesLimit })} popular={isPopular} />
                      <FeatureRow check text={t('landing.pricing.transcriptsSummary')} popular={isPopular} />
                      <FeatureRow check={hasVideo} text={t('landing.pricing.videoCaption')} popular={isPopular} />
                      <FeatureRow check={hasCloudSave} text={featureLabels.cloudSave || 'Cloud Save'} popular={isPopular} />
                      <FeatureRow check={hasProAnalysis} text={t('landing.pricing.advancedInsights')} popular={isPopular} />
                      {langChanges === -1 && (
                        <FeatureRow check text={featureLabels.languageChanges ? `${featureLabels.languageChanges}: Unlimited` : 'Unlimited Translations'} popular={isPopular} />
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
                      className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                        isPopular
                          ? 'bg-white text-slate-900 hover:bg-indigo-50 hover:shadow-lg'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      {plan.price === 0 ? t('landing.pricing.startRecording') : t('landing.pricing.startUpgrade')}
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Feature comparison table toggle */}
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="mx-auto flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors mb-4"
              >
                {t('landing.pricing.compareFeatures')}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showComparison ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showComparison && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('landing.pricing.feature')}</th>
                            {plans.map((p) => (
                              <th key={p.id} className="text-center py-3 px-4 font-semibold text-slate-700">{p.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: t('landing.pricing.feature') + ': ' + t('landing.pricing.monthly'), values: plans.map((p) => `${p.features?.minutesLimit ?? p.minutes_limit ?? 0} min`) },
                            { label: t('landing.pricing.transcriptsSummary'), values: plans.map(() => true) },
                            { label: t('landing.pricing.videoCaption'), values: plans.map((p) => !!(p.features?.videoCaption ?? p.video_caption)) },
                            { label: featureLabels.cloudSave || 'Cloud Save', values: plans.map((p) => !!(p.features?.cloudSave ?? p.cloud_save)) },
                            { label: t('landing.pricing.advancedInsights'), values: plans.map((p) => !!(p.features?.proAnalysis ?? p.pro_analysis_enabled)) },
                          ].map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-3 px-4 text-slate-600">{row.label}</td>
                              {row.values.map((val, j) => (
                                <td key={j} className="text-center py-3 px-4">
                                  {typeof val === 'boolean' ? (
                                    val ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />
                                  ) : (
                                    <span className="text-slate-700 font-medium">{val}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Money-back guarantee */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center mt-10"
            >
              <div className="inline-flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                {t('landing.pricing.moneyBack')}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}

function FeatureRow({ check, text, popular }: { check: boolean; text: string; popular: boolean }) {
  return (
    <li className="flex items-start gap-3">
      {check ? (
        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${popular ? 'text-emerald-400' : 'text-emerald-500'}`} />
      ) : (
        <X className={`w-4 h-4 mt-0.5 shrink-0 ${popular ? 'text-slate-600' : 'text-slate-300'}`} />
      )}
      <span className={!check ? 'line-through opacity-50' : ''}>{text}</span>
    </li>
  );
}
