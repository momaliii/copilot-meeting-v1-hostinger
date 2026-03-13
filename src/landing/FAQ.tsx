import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

type Category = 'general' | 'pricing' | 'privacy';

const FAQS: { qKey: string; aKey: string; category: Category }[] = [
  { qKey: 'landing.faq.q1', aKey: 'landing.faq.a1', category: 'privacy' },
  { qKey: 'landing.faq.q2', aKey: 'landing.faq.a2', category: 'privacy' },
  { qKey: 'landing.faq.q3', aKey: 'landing.faq.a3', category: 'general' },
  { qKey: 'landing.faq.q4', aKey: 'landing.faq.a4', category: 'general' },
  { qKey: 'landing.faq.q5', aKey: 'landing.faq.a5', category: 'pricing' },
  { qKey: 'landing.faq.q6', aKey: 'landing.faq.a6', category: 'general' },
];

const CATEGORIES: { id: Category | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'landing.faq.all' },
  { id: 'general', labelKey: 'landing.faq.general' },
  { id: 'pricing', labelKey: 'landing.faq.pricingCat' },
  { id: 'privacy', labelKey: 'landing.faq.privacyCat' },
];

function AccordionItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [answer, isOpen]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between cursor-pointer p-5 sm:p-6 font-semibold text-slate-900 text-left font-heading"
        aria-expanded={isOpen}
      >
        <span className="pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? height : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div ref={contentRef} className="px-5 sm:px-6 pb-5 sm:pb-6 text-slate-600 leading-relaxed font-body">
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  const filteredFaqs = activeCategory === 'all'
    ? FAQS
    : FAQS.filter((f) => f.category === activeCategory);

  return (
    <section id="faq" className="py-24 bg-slate-50 border-y border-slate-200 scroll-mt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">{t('landing.faq.title')}</h2>
          <p className="text-lg text-slate-600 font-body">{t('landing.faq.subtitle')}</p>
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setOpenIndex(0); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          className="space-y-3"
        >
          {filteredFaqs.map((faq, idx) => (
            <motion.div key={`${activeCategory}-${idx}`} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
              <AccordionItem
                question={t(faq.qKey)}
                answer={t(faq.aKey)}
                isOpen={openIndex === idx}
                onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Still have questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12 bg-white rounded-2xl border border-slate-200 p-8"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-2 font-heading">{t('landing.faq.stillHaveQuestions')}</h3>
          <p className="text-slate-600 mb-4 font-body">{t('landing.faq.reachOut')}</p>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/contact');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            {t('landing.faq.contactSupport')}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
