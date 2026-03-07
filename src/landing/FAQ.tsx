import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

export default function FAQ() {
  const { t } = useTranslation();
  const faqs = [
    { qKey: 'landing.faq.q1', aKey: 'landing.faq.a1' },
    { qKey: 'landing.faq.q2', aKey: 'landing.faq.a2' },
    { qKey: 'landing.faq.q3', aKey: 'landing.faq.a3' },
    { qKey: 'landing.faq.q4', aKey: 'landing.faq.a4' },
    { qKey: 'landing.faq.q5', aKey: 'landing.faq.a5' },
    { qKey: 'landing.faq.q6', aKey: 'landing.faq.a6' }
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
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-white border-y border-slate-200 scroll-mt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.faq.title')}</h2>
          <p className="text-lg text-slate-600 font-body">{t('landing.faq.subtitle')}</p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-4"
        >
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const answerId = `faq-answer-${idx}`;
            const buttonId = `faq-button-${idx}`;
            return (
            <motion.div
              key={idx} 
              variants={itemVariants}
              className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md"
            >
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between cursor-pointer p-6 font-semibold text-slate-900 text-left font-heading"
              >
                {t(faq.qKey)}
                <span className="relative flex shrink-0 ml-1.5 w-5 h-5" aria-hidden="true">
                  <span className={`absolute bg-slate-400 h-0.5 w-5 top-1/2 -translate-y-1/2 rounded-full transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></span>
                  <span className={`absolute bg-slate-400 h-5 w-0.5 left-1/2 -translate-x-1/2 rounded-full transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}></span>
                </span>
              </button>
              {isOpen && (
                <div id={answerId} role="region" aria-labelledby={buttonId} className="px-6 pb-6 text-slate-600 leading-relaxed font-body animate-in fade-in slide-in-from-top-4 duration-300">
                  {t(faq.aKey)}
                </div>
              )}
            </motion.div>
          )})}
        </motion.div>
      </div>
    </section>
  );
}
