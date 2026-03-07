import { useTranslation } from 'react-i18next';
import { Quote } from 'lucide-react';
import { motion } from 'motion/react';

const STATS = [
  { value: '10,000+', labelKey: 'landing.socialProof.meetingsAnalyzed' },
  { value: '50+', labelKey: 'landing.socialProof.teams' },
  { value: '98%', labelKey: 'landing.socialProof.satisfaction' }
];

const TESTIMONIALS = [
  { quoteKey: 'landing.socialProof.quote1', nameKey: 'landing.socialProof.name1', roleKey: 'landing.socialProof.role1' },
  { quoteKey: 'landing.socialProof.quote2', nameKey: 'landing.socialProof.name2', roleKey: 'landing.socialProof.role2' },
  { quoteKey: 'landing.socialProof.quote3', nameKey: 'landing.socialProof.name3', roleKey: 'landing.socialProof.role3' }
];

export default function SocialProof() {
  const { t } = useTranslation();
  return (
    <section className="py-16 sm:py-20 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-8 sm:gap-16 mb-16"
        >
          {STATS.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{stat.value}</div>
              <div className="text-sm text-slate-500 font-body">{t(stat.labelKey)}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-3 gap-8"
        >
          {TESTIMONIALS.map((testimonial, idx) => (
            <div
              key={idx}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100"
            >
              <Quote className="w-8 h-8 text-indigo-200 mb-4" />
              <p className="text-slate-700 leading-relaxed font-body mb-4">&ldquo;{t(testimonial.quoteKey)}&rdquo;</p>
              <div>
                <div className="font-semibold text-slate-900 font-heading">{t(testimonial.nameKey)}</div>
                <div className="text-sm text-slate-500 font-body">{t(testimonial.roleKey)}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
