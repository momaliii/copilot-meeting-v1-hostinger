import { useTranslation } from 'react-i18next';
import { Lock, CloudUpload, Database, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function PrivacySection() {
  const { t } = useTranslation();
  const items = [
    { icon: Lock, titleKey: 'landing.privacy.consentFirst', descKey: 'landing.privacy.consentDesc' },
    { icon: CloudUpload, titleKey: 'landing.privacy.aiProcessing', descKey: 'landing.privacy.aiDesc' },
    { icon: Database, titleKey: 'landing.privacy.storageOptions', descKey: 'landing.privacy.storageDesc' },
    { icon: ShieldCheck, titleKey: 'landing.privacy.leastPrivilege', descKey: 'landing.privacy.leastDesc' }
  ];

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
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="privacy" className="py-24 bg-slate-900 text-white scroll-mt-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">{t('landing.privacy.title')}</h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto font-body">
            {t('landing.privacy.subtitle')}
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.8)" }}
                className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 flex items-start gap-4 transition-all duration-300 cursor-default hover:border-indigo-500/30"
              >
                <div className="bg-slate-700 p-3 rounded-xl shrink-0">
                  <Icon className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 font-heading">{t(item.titleKey)}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm font-body">{t(item.descKey)}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
