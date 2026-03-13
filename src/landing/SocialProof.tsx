import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Quote } from 'lucide-react';
import { motion } from 'motion/react';

const STATS = [
  { target: 10000, suffix: '+', labelKey: 'landing.socialProof.meetingsAnalyzed' },
  { target: 50, suffix: '+', labelKey: 'landing.socialProof.teams' },
  { target: 98, suffix: '%', labelKey: 'landing.socialProof.satisfaction' },
];

const TESTIMONIALS = [
  { quoteKey: 'landing.socialProof.quote1', nameKey: 'landing.socialProof.name1', roleKey: 'landing.socialProof.role1', initials: 'SC', color: 'bg-indigo-500' },
  { quoteKey: 'landing.socialProof.quote2', nameKey: 'landing.socialProof.name2', roleKey: 'landing.socialProof.role2', initials: 'MJ', color: 'bg-violet-500' },
  { quoteKey: 'landing.socialProof.quote3', nameKey: 'landing.socialProof.name3', roleKey: 'landing.socialProof.role3', initials: 'ER', color: 'bg-emerald-500' },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = target / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [started, target]);

  const formatted = count >= 1000 ? `${(count / 1000).toFixed(count >= target ? 0 : 1)}K` : `${count}`;

  return (
    <div ref={ref} className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tabular-nums">
      {started ? `${target >= 10000 ? (count >= target ? '10,000' : formatted) : count}${suffix}` : `0${suffix}`}
    </div>
  );
}

export default function SocialProof() {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-indigo-50/30 to-slate-50 -z-10" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-10 sm:gap-20 mb-16"
        >
          {STATS.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <AnimatedCounter target={stat.target} suffix={stat.suffix} />
              <div className="text-sm text-slate-500 font-body mt-1">{t(stat.labelKey)}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {TESTIMONIALS.map((testimonial, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Star rating */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <Quote className="w-7 h-7 text-indigo-200 mb-3" />
              <p className="text-slate-700 leading-relaxed font-body mb-5">&ldquo;{t(testimonial.quoteKey)}&rdquo;</p>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {testimonial.initials}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm font-heading">{t(testimonial.nameKey)}</div>
                  <div className="text-xs text-slate-500 font-body">{t(testimonial.roleKey)}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
