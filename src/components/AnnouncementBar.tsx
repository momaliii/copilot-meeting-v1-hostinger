import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Megaphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const DISMISSED_KEY = 'dismissedAnnouncements';
const MARQUEE_THRESHOLD = 60;

export type AnnouncementContext = 'public' | 'user_app' | 'admin_app';

type AnnouncementBarProps = {
  context?: AnnouncementContext;
};

function PriorityIcon({ priority }: { priority: string }) {
  const className = 'w-4 h-4 shrink-0 opacity-90';
  if (priority === 'warning') return <AlertTriangle className={className} />;
  if (priority === 'success') return <CheckCircle className={className} />;
  return <Megaphone className={className} />;
}

export default function AnnouncementBar({ context = 'public' }: AnnouncementBarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [announcements, setAnnouncements] = useState<{ id: string; message: string; priority?: string }[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem(DISMISSED_KEY);
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetch(`/api/public/announcement?context=${encodeURIComponent(context)}`)
      .then((r) => r.json())
      .then((data) => setAnnouncements(data?.items || []))
      .catch(() => setAnnouncements([]));
  }, [context]);

  const visible = announcements.filter((a) => !dismissedIds.has(a.id) && (a.message || '').trim());
  const first = visible[0];

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  if (!first) return null;

  const priority = first.priority || 'info';
  const bgClass = priority === 'warning' ? 'bg-amber-500' : priority === 'success' ? 'bg-emerald-600' : 'bg-indigo-600';
  const hoverClass = priority === 'warning' ? 'hover:bg-amber-600' : priority === 'success' ? 'hover:bg-emerald-700' : 'hover:bg-indigo-500';
  const useMarquee = (first.message || '').length > MARQUEE_THRESHOLD && !reduceMotion;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={first.id}
        initial={reduceMotion ? undefined : { opacity: 0, y: -16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`sticky top-0 z-[60] w-full shrink-0 min-h-0 ${bgClass} text-white px-4 py-2 flex items-center justify-between gap-4`}
        role="banner"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
          <PriorityIcon priority={priority} />
          {useMarquee ? (
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="announcement-marquee text-sm font-medium whitespace-nowrap">
                <span>{first.message}</span>
                <span aria-hidden className="inline-block ms-8">{first.message}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium flex-1 min-w-0">{first.message}</p>
          )}
        </div>
        <motion.button
          onClick={() => handleDismiss(first.id)}
          className={`shrink-0 p-1 ${hoverClass} rounded transition-colors`}
          aria-label={t('announcement.dismiss')}
          whileHover={reduceMotion ? undefined : { scale: 1.08 }}
          whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
