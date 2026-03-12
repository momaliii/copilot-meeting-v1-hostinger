import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Zap, Loader2, AlertCircle } from 'lucide-react';
import { formatDate } from './utils/format';
import MeetingDetailsTabs, { type TabId } from './components/MeetingDetailsTabs';

export default function SharedMeeting({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const [meeting, setMeeting] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [scrollToLine, setScrollToLine] = useState<number | undefined>(undefined);

  useEffect(() => {
    const hash = window.location.hash;
    const lineMatch = hash.match(/^#transcript-line-(\d+)$/);
    if (lineMatch) {
      setActiveTab('transcript');
      setScrollToLine(parseInt(lineMatch[1], 10));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    if (lang === 'ar' || lang === 'en') i18n.changeLanguage(lang);
  }, [i18n]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMeeting = async () => {
      try {
        const res = await fetch(`/api/public/share/${token}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error('Meeting not found or access denied');
        }
        const data = await res.json();
        if (data.analysis_json) {
          data.analysis = typeof data.analysis_json === 'string' ? JSON.parse(data.analysis_json) : data.analysis_json;
        } else if (data.analysis) {
          data.analysis = data.analysis;
        } else {
          data.analysis = {};
        }
        if (data.transcript && !data.analysis.transcript) {
          data.analysis.transcript = data.transcript;
        }
        setMeeting(data);
      } catch (err: any) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
    return () => controller.abort();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('shared.meetingNotFound')}</h2>
          <p className="text-slate-600 mb-6">{error || t('shared.meetingNotFoundDesc')}</p>
          <a href="/" className="inline-flex items-center justify-center bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            {t('shared.goToHomepage')}
          </a>
        </div>
      </div>
    );
  }

  const analysis = meeting.analysis;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">Meeting Copilot</h1>
          </div>
          <a href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            {t('shared.createYourOwn')}
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{meeting.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDate(meeting.date)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <MeetingDetailsTabs
            analysis={analysis}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            meetingTitle={meeting.title}
            onSendViaGmail={(subject, body) => {
              window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
            }}
            showBadges={true}
            scrollToLine={scrollToLine}
          />
        </div>
      </main>
    </div>
  );
}
