import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, CheckSquare, Users, Mail, Lightbulb, AlertTriangle, HelpCircle, Activity, Search, Copy, Download, ChevronDown, Edit2, Printer, Link } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { AnalysisResult } from '../types/meeting';

const TRANSCRIPT_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-900',
  'bg-emerald-50 border-emerald-200 text-emerald-900',
  'bg-purple-50 border-purple-200 text-purple-900',
  'bg-amber-50 border-amber-200 text-amber-900',
  'bg-rose-50 border-rose-200 text-rose-900',
  'bg-cyan-50 border-cyan-200 text-cyan-900',
];

function getSpeakerColor(speaker: string): string {
  let hash = 0;
  for (let j = 0; j < speaker.length; j++) {
    hash = speaker.charCodeAt(j) + ((hash << 5) - hash);
  }
  return TRANSCRIPT_COLORS[Math.abs(hash) % TRANSCRIPT_COLORS.length];
}

export type TabId = 'summary' | 'insights' | 'actionItems' | 'transcript' | 'email';

type MeetingDetailsTabsProps = {
  analysis: AnalysisResult;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  meetingTitle?: string;
  onSendViaGmail?: (subject: string, body: string) => void;
  showBadges?: boolean;
  onActionItemToggle?: (index: number, completed: boolean) => void;
  onSpeakerRename?: (original: string, newName: string) => void;
  tabBarRef?: React.RefObject<HTMLDivElement | null>;
  audioCurrentTime?: number;
  audioDuration?: number;
  hasAudioOrVideo?: boolean;
  seekTo?: (seconds: number) => void;
  scrollToLine?: number;
};

export default function MeetingDetailsTabs({
  analysis,
  activeTab,
  onTabChange,
  meetingTitle = 'Meeting',
  onSendViaGmail,
  showBadges = false,
  onActionItemToggle,
  onSpeakerRename,
  tabBarRef,
  audioCurrentTime = 0,
  audioDuration = 0,
  hasAudioOrVideo = false,
  seekTo,
  scrollToLine,
}: MeetingDetailsTabsProps) {
  const { t } = useTranslation();
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string>>(new Set());
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editingSpeakerValue, setEditingSpeakerValue] = useState('');
  const transcriptPanelRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const showCopyToast = () => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const transcriptLines = analysis.transcript?.split('\n').filter((line) => line.trim() !== '') ?? [];
  const transcriptTurnCount = transcriptLines.filter((line) => line.match(/^(.+?):\s*(.*)/)).length;

  const speakers = useMemo(() => {
    const seen = new Set<string>();
    transcriptLines.forEach((line) => {
      const m = line.match(/^(.+?):\s*(.*)/);
      if (m) seen.add(m[1].trim());
    });
    return Array.from(seen);
  }, [transcriptLines]);

  const getDisplayName = (speaker: string) => analysis.speakerNames?.[speaker] ?? speaker;

  const transcriptStats = useMemo(() => {
    const fullText = transcriptLines.map((line) => {
      const m = line.match(/^(.+?):\s*(.*)/);
      return m ? m[2].trim() : line;
    }).join(' ');
    const words = fullText.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const readingTimeMins = Math.ceil(wordCount / 225) || 0;
    const speakerWordCounts: Record<string, number> = {};
    transcriptLines.forEach((line) => {
      const m = line.match(/^(.+?):\s*(.*)/);
      if (m) {
        const speaker = m[1].trim();
        const textWords = m[2].trim().split(/\s+/).filter((w) => w.length > 0).length;
        speakerWordCounts[speaker] = (speakerWordCounts[speaker] ?? 0) + textWords;
      }
    });
    const total = Object.values(speakerWordCounts).reduce((a, b) => a + b, 0);
    const speakerDistribution = total > 0
      ? Object.entries(speakerWordCounts)
        .map(([s, c]) => ({ speaker: s, pct: Math.round((c / total) * 100) }))
        .sort((a, b) => b.pct - a.pct)
      : [];
    return { wordCount, readingTimeMins, speakerDistribution };
  }, [transcriptLines]);

  const transcriptSegmentsWithTime = useMemo(() => {
    const durationMs = (audioDuration && hasAudioOrVideo ? audioDuration : 0) * 1000;
    const n = transcriptLines.length;
    return transcriptLines.map((line, i) => ({
      line,
      index: i,
      startMs: n > 0 ? (i / n) * durationMs : 0,
      endMs: n > 0 ? ((i + 1) / n) * durationMs : 0,
    }));
  }, [transcriptLines, audioDuration, hasAudioOrVideo]);

  const filteredTranscriptLines = useMemo(() => {
    let segments = transcriptSegmentsWithTime;
    if (selectedSpeakers.size > 0) {
      segments = segments.filter((s) => {
        const m = s.line.match(/^(.+?):\s*(.*)/);
        if (m) return selectedSpeakers.has(m[1].trim());
        return false;
      });
    }
    if (transcriptSearch.trim()) {
      const q = transcriptSearch.toLowerCase().trim();
      segments = segments.filter((s) => s.line.toLowerCase().includes(q));
    }
    return segments;
  }, [transcriptSegmentsWithTime, transcriptSearch, selectedSpeakers]);

  const currentSegmentIndex = useMemo(() => {
    if (!hasAudioOrVideo || audioDuration <= 0 || transcriptSegmentsWithTime.length === 0) return -1;
    const tMs = audioCurrentTime * 1000;
    const seg = transcriptSegmentsWithTime.find((s) => tMs >= s.startMs && tMs < s.endMs);
    return seg ? seg.index : -1;
  }, [audioCurrentTime, audioDuration, hasAudioOrVideo, transcriptSegmentsWithTime]);

  useEffect(() => {
    if (activeTab !== 'transcript' || currentSegmentIndex < 0) return;
    const el = document.getElementById(`transcript-line-${currentSegmentIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeTab, currentSegmentIndex]);

  useEffect(() => {
    if (scrollToLine == null || activeTab !== 'transcript') return;
    const el = document.getElementById(`transcript-line-${scrollToLine}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToLine, activeTab]);

  const toggleSpeaker = (speaker: string) => {
    setSelectedSpeakers((prev) => {
      const next = new Set(prev);
      if (next.has(speaker)) next.delete(speaker);
      else next.add(speaker);
      return next;
    });
  };

  const handleSelectAllSpeakers = () => setSelectedSpeakers(new Set(speakers));
  const handleClearSpeakerFilter = () => setSelectedSpeakers(new Set());

  const copyLinkToLine = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const hash = `#transcript-line-${index}`;
    window.location.hash = hash;
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    navigator.clipboard.writeText(url);
    showCopyToast();
  };

  const useVirtual = filteredTranscriptLines.length > 30;
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filteredTranscriptLines.length : 0,
    getScrollElement: () => transcriptScrollRef.current,
    estimateSize: () => 88,
    overscan: 5,
  });

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const copyFullTranscript = () => {
    navigator.clipboard.writeText(analysis.transcript || '');
    showCopyToast();
  };

  const copySpeakerTranscript = (speaker: string) => {
    const lines = transcriptLines.filter((line) => {
      const m = line.match(/^(.+?):\s*(.*)/);
      return m && m[1].trim() === speaker;
    });
    navigator.clipboard.writeText(lines.join('\n\n'));
    showCopyToast();
  };

  const exportTranscriptTxt = () => {
    const blob = new Blob([analysis.transcript || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  const exportTranscriptMarkdown = () => {
    const lines = transcriptLines.map((line) => {
      const m = line.match(/^(.+?):\s*(.*)/);
      if (m) return `### ${getDisplayName(m[1].trim())}\n\n${m[2].trim()}`;
      return line;
    });
    const md = `# ${t('meeting.transcript')}\n\n${lines.join('\n\n')}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  const printTranscript = () => {
    const speakerColors: Record<string, string> = {};
    speakers.forEach((s, i) => {
      const colors = ['#dbeafe', '#d1fae5', '#f3e8ff', '#fef3c7', '#ffe4e6', '#cffafe'];
      speakerColors[s] = colors[i % colors.length];
    });
    const blocks = transcriptLines.map((line) => {
      const m = line.match(/^(.+?):\s*(.*)/);
      const escaped = (t: string) => t.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      if (m) {
        const speaker = m[1].trim();
        const displayName = getDisplayName(speaker);
        const bg = speakerColors[speaker] || '#f1f5f9';
        return `<div style="margin-bottom:1rem;padding:1rem;border-radius:0.5rem;border:1px solid #e2e8f0;background:${bg}"><div style="font-weight:700;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.8;margin-bottom:0.25rem">${escaped(displayName)}</div><div style="line-height:1.6">${escaped(m[2].trim())}</div></div>`;
      }
      return `<div style="margin-bottom:1rem;padding:1rem;border-radius:0.5rem;border:1px solid #e2e8f0;background:#fff">${escaped(line)}</div>`;
    });
    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>${meetingTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')} - ${t('meeting.transcript')}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.25rem; margin-bottom: 1.5rem; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>${meetingTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
  <h2 style="font-size:1rem;margin-bottom:1rem;color:#64748b">${t('meeting.transcript')}</h2>
  ${blocks.join('')}
</body>
</html>`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'summary', label: t('meeting.summary'), icon: FileText },
    { id: 'insights', label: t('meeting.insights'), icon: Lightbulb },
    { id: 'actionItems', label: t('meeting.actionItems'), icon: CheckSquare, badge: analysis.actionItems?.length ?? 0 },
    { id: 'transcript', label: t('meeting.transcript'), icon: Users, badge: showBadges ? transcriptTurnCount : undefined },
    { id: 'email', label: t('meeting.followUpEmail'), icon: Mail },
  ];

  const tabBar = (
    <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar scroll-smooth snap-x snap-mandatory" role="tablist" aria-label={t('meeting.summary')}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap snap-start min-h-[44px] sm:min-h-0 ${
              isActive
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {tab.label}
            {showBadges && tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {tabBarRef?.current && typeof document !== 'undefined' ? createPortal(tabBar, tabBarRef.current) : tabBar}

      <div className="p-4 sm:p-6 md:p-8">
        {activeTab === 'summary' && (
          <div id="panel-summary" role="tabpanel" aria-labelledby="tab-summary" className="animate-in fade-in">
            <div className={`grid gap-6 md:gap-8 ${analysis.keyDecisions?.length ? 'md:grid-cols-2' : ''}`}>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  {t('meeting.executiveSummary')}
                  {analysis.summaryConfidence !== undefined && (
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                      {t('meeting.confidence', { value: analysis.summaryConfidence })}
                    </span>
                  )}
                </h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
                </div>
              </div>

              {analysis.keyDecisions && analysis.keyDecisions.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-l-4 border-indigo-500 pl-3">{t('meeting.keyDecisions')}</h3>
                  <ul className="space-y-3">
                    {analysis.keyDecisions.map((item, i) => {
                      const decisionText = typeof item === 'string' ? item : item.decision;
                      const confidence = typeof item === 'object' && item.confidence ? item.confidence : null;
                      return (
                        <li key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="mt-0.5 bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <span className="text-slate-700">{decisionText}</span>
                            {confidence !== null && (
                              <span className="ml-2 text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {t('meeting.confidence', { value: confidence })}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div id="panel-insights" role="tabpanel" aria-labelledby="tab-insights" className="space-y-8 animate-in fade-in">
            {analysis.sentimentTrend && analysis.sentimentTrend.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  {t('meeting.sentimentTrend')}
                </h3>
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysis.sentimentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="timeSegment" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis domain={[-100, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                          formatter={(value: number) => [
                            <span key="val" style={{ color: value > 0 ? '#10b981' : value < 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                              {value}
                            </span>,
                            t('meeting.score'),
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#6366f1"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {analysis.sentimentTrend.map((trend, i) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-slate-50">
                        <div className="text-xs text-slate-500 mb-1">{trend.timeSegment}</div>
                        <div className="font-medium text-sm text-slate-800">{trend.sentiment}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analysis.topics && analysis.topics.length > 0 && (
              <div className={analysis.sentimentTrend && analysis.sentimentTrend.length > 0 ? 'pt-6 border-t border-slate-100' : ''}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  {t('meeting.keyTopicsDiscussed')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.topics.map((topic, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                      <h4 className="font-semibold text-slate-800 mb-1">
                        {topic.name}
                        {topic.confidence !== undefined && (
                          <span className="ml-2 text-xs font-medium text-amber-500/80 bg-amber-50 px-1.5 py-0.5 rounded">
                            {topic.confidence}%
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-600">{topic.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.risks && analysis.risks.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  {t('meeting.risksBlockers')}
                </h3>
                <ul className="space-y-3">
                  {analysis.risks.map((item, i) => {
                    const riskText = typeof item === 'string' ? item : item.risk;
                    const confidence = typeof item === 'object' && item.confidence ? item.confidence : null;
                    return (
                      <li key={i} className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-100 text-red-800">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                        <div className="flex-1">
                          <span className="text-sm">{riskText}</span>
                          {confidence !== null && (
                            <span className="ml-2 text-xs font-medium text-red-400/80 bg-red-100 px-1.5 py-0.5 rounded">
                              {t('meeting.confidence', { value: confidence })}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {analysis.questions && analysis.questions.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  {t('meeting.keyQuestionsRaised')}
                </h3>
                <ul className="space-y-3">
                  {analysis.questions.map((item, i) => {
                    const questionText = typeof item === 'string' ? item : item.question;
                    const confidence = typeof item === 'object' && item.confidence ? item.confidence : null;
                    return (
                      <li key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                        <div className="flex-1">
                          <span className="text-sm">{questionText}</span>
                          {confidence !== null && (
                            <span className="ml-2 text-xs font-medium text-blue-400/80 bg-blue-100 px-1.5 py-0.5 rounded">
                              {t('meeting.confidence', { value: confidence })}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {(!analysis.topics || analysis.topics.length === 0) &&
              (!analysis.risks || analysis.risks.length === 0) &&
              (!analysis.questions || analysis.questions.length === 0) &&
              (!analysis.sentimentTrend || analysis.sentimentTrend.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lightbulb className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">{t('meeting.noAdditionalInsights')}</p>
                </div>
              )}
          </div>
        )}

        {activeTab === 'actionItems' && (
          <div id="panel-actionItems" role="tabpanel" aria-labelledby="tab-actionItems" className="animate-in fade-in">
            {(analysis.actionItems ?? []).length > 0 ? (
              <div className="grid gap-4">
                {(analysis.actionItems ?? []).map((item, i) => {
                  const completed = item.completed ?? false;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white group"
                    >
                      <div className="mt-1">
                        {onActionItemToggle ? (
                          <button
                            onClick={() => onActionItemToggle(i, !completed)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              completed ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 group-hover:border-indigo-500'
                            }`}
                            aria-label={completed ? t('meeting.markIncomplete') : t('meeting.markComplete')}
                          >
                            {completed && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-slate-300 group-hover:border-indigo-500 transition-colors"></div>
                        )}
                      </div>
                      <div className={`flex-1 ${completed ? 'opacity-60 line-through' : ''}`}>
                        <p className="text-slate-900 font-medium">
                          {item.task}
                          {item.confidence !== undefined && (
                            <span className="ml-2 text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.confidence}%
                            </span>
                          )}
                        </p>
                        {item.assignee && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
                              {item.assignee.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-500">{t('meeting.assignedTo', { name: item.assignee })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckSquare className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">{t('meeting.noActionItems')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div id="panel-transcript" role="tabpanel" aria-labelledby="tab-transcript" className="animate-in fade-in relative" ref={transcriptPanelRef}>
            {copyToast && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg animate-in fade-in zoom-in-95">
                {t('meeting.transcriptCopied')}
              </div>
            )}
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-white py-2 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      placeholder={t('meeting.searchTranscript')}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={copyFullTranscript}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] sm:min-h-0"
                  >
                    <Copy className="w-4 h-4" />
                    {t('meeting.copyFullTranscript')}
                  </button>
                  <div className="relative" ref={exportDropdownRef}>
                    <button
                      onClick={() => setExportDropdownOpen((o) => !o)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] sm:min-h-0"
                    >
                      <Download className="w-4 h-4" />
                      {t('meeting.exportTranscript')}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {exportDropdownOpen && (
                      <div className="absolute right-0 mt-1 py-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                        <button
                          onClick={exportTranscriptTxt}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('meeting.exportTranscriptTxt')}
                        </button>
                        <button
                          onClick={exportTranscriptMarkdown}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('meeting.exportTranscriptMarkdown')}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={printTranscript}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] sm:min-h-0"
                  >
                    <Printer className="w-4 h-4" />
                    {t('meeting.printTranscript')}
                  </button>
                </div>
                {transcriptStats.wordCount > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                    <span>{t('meeting.transcriptWords', { count: transcriptStats.wordCount })}</span>
                    <span>{t('meeting.transcriptReadingTime', { minutes: transcriptStats.readingTimeMins })}</span>
                    {transcriptStats.speakerDistribution.length > 0 && (
                      <span className="flex flex-wrap items-center gap-x-1 gap-y-0">
                        {transcriptStats.speakerDistribution.map(({ speaker, pct }, i) => (
                          <span key={speaker}>
                            {i > 0 && ' · '}
                            {getDisplayName(speaker)} {pct}%
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                )}
                {speakers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('meeting.speakerLegend')}:</span>
                    {speakers.map((speaker) => {
                      const colorClass = getSpeakerColor(speaker);
                      const isSelected = selectedSpeakers.has(speaker);
                      const displayName = getDisplayName(speaker);
                      const isEditing = editingSpeaker === speaker;
                      return (
                        <div key={speaker} className="flex items-center gap-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingSpeakerValue}
                              onChange={(e) => setEditingSpeakerValue(e.target.value)}
                              onBlur={() => {
                                const trimmed = editingSpeakerValue.trim();
                                if (trimmed && trimmed !== speaker && onSpeakerRename) {
                                  onSpeakerRename(speaker, trimmed);
                                }
                                setEditingSpeaker(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const trimmed = editingSpeakerValue.trim();
                                  if (trimmed && trimmed !== speaker && onSpeakerRename) {
                                    onSpeakerRename(speaker, trimmed);
                                  }
                                  setEditingSpeaker(null);
                                } else if (e.key === 'Escape') {
                                  setEditingSpeaker(null);
                                  setEditingSpeakerValue('');
                                }
                              }}
                              autoFocus
                              className="px-2 py-1 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24"
                            />
                          ) : (
                            <>
                              <button
                                onClick={() => toggleSpeaker(speaker)}
                                className={`px-2 py-1 rounded-md border text-xs font-medium transition-all ${colorClass} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:opacity-90'}`}
                                title={t('meeting.filterBySpeaker')}
                              >
                                {displayName}
                              </button>
                              {onSpeakerRename && (
                                <button
                                  onClick={() => {
                                    setEditingSpeaker(speaker);
                                    setEditingSpeakerValue(displayName);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                  title={t('meeting.renameSpeaker')}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                          {!isEditing && (
                            <button
                              onClick={() => copySpeakerTranscript(speaker)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title={t('meeting.copySpeakerTranscript', { speaker: displayName })}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {speakers.length > 1 && (
                      <>
                        <button
                          onClick={handleSelectAllSpeakers}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {t('meeting.selectAllSpeakers')}
                        </button>
                        <button
                          onClick={handleClearSpeakerFilter}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          {t('meeting.clearSpeakerFilter')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0 flex flex-col pt-4">
                {filteredTranscriptLines.length > 0 ? (
                  useVirtual ? (
                    <div
                      ref={transcriptScrollRef}
                      className="flex-1 overflow-auto min-h-[300px] max-h-[60vh] rounded-lg border border-slate-200"
                    >
                      <div
                        style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const seg = filteredTranscriptLines[virtualRow.index];
                          const speakerMatch = seg.line.match(/^(.+?):\s*(.*)/);
                          const isCurrent = seg.index === currentSegmentIndex;
                          const highlightClass = isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : '';
                          const handleClick = seekTo ? () => seekTo(seg.startMs / 1000) : undefined;
                          return (
                            <div
                              key={virtualRow.key}
                              id={`transcript-line-${seg.index}`}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                                paddingBottom: '0.75rem',
                              }}
                            >
                              {speakerMatch ? (
                                <div
                                  className={`relative p-4 pr-10 rounded-xl border ${getSpeakerColor(speakerMatch[1].trim())} shadow-sm ${highlightClass} ${handleClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                                  onClick={handleClick}
                                  role={handleClick ? 'button' : undefined}
                                >
                                  <button type="button" onClick={(e) => copyLinkToLine(seg.index, e)} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors" title={t('meeting.copyLinkToLine')}>
                                    <Link className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="font-bold text-sm uppercase tracking-wider mb-1 opacity-80">{getDisplayName(speakerMatch[1].trim())}</div>
                                  <div className="leading-relaxed">{highlightText(speakerMatch[2].trim(), transcriptSearch)}</div>
                                </div>
                              ) : (
                                <div
                                  className={`relative p-4 pr-10 rounded-xl border border-slate-200 bg-white shadow-sm text-slate-700 leading-relaxed ${highlightClass} ${handleClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                                  onClick={handleClick}
                                  role={handleClick ? 'button' : undefined}
                                >
                                  <button type="button" onClick={(e) => copyLinkToLine(seg.index, e)} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors" title={t('meeting.copyLinkToLine')}>
                                    <Link className="w-3.5 h-3.5" />
                                  </button>
                                  {highlightText(seg.line, transcriptSearch)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto" ref={transcriptScrollRef}>
                      {filteredTranscriptLines.map((seg) => {
                        const speakerMatch = seg.line.match(/^(.+?):\s*(.*)/);
                        const isCurrent = seg.index === currentSegmentIndex;
                        const highlightClass = isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2' : '';
                        const handleClick = seekTo ? () => seekTo(seg.startMs / 1000) : undefined;
                        if (speakerMatch) {
                          const speaker = speakerMatch[1].trim();
                          const text = speakerMatch[2].trim();
                          const colorClass = getSpeakerColor(speaker);
                          return (
                            <div
                              key={seg.index}
                              id={`transcript-line-${seg.index}`}
                              className={`relative p-4 pr-10 rounded-xl border ${colorClass} shadow-sm ${highlightClass} ${handleClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                              onClick={handleClick}
                              role={handleClick ? 'button' : undefined}
                            >
                              <button type="button" onClick={(e) => copyLinkToLine(seg.index, e)} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors" title={t('meeting.copyLinkToLine')}>
                                <Link className="w-3.5 h-3.5" />
                              </button>
                              <div className="font-bold text-sm uppercase tracking-wider mb-1 opacity-80">{getDisplayName(speaker)}</div>
                              <div className="leading-relaxed">{highlightText(text, transcriptSearch)}</div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={seg.index}
                            id={`transcript-line-${seg.index}`}
                            className={`relative p-4 pr-10 rounded-xl border border-slate-200 bg-white shadow-sm text-slate-700 leading-relaxed ${highlightClass} ${handleClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                            onClick={handleClick}
                            role={handleClick ? 'button' : undefined}
                          >
                            <button type="button" onClick={(e) => copyLinkToLine(seg.index, e)} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors" title={t('meeting.copyLinkToLine')}>
                              <Link className="w-3.5 h-3.5" />
                            </button>
                            {highlightText(seg.line, transcriptSearch)}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : transcriptSearch.trim() ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">{t('meeting.noSearchResults')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">{t('meeting.noTranscript')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div id="panel-email" role="tabpanel" aria-labelledby="tab-email" className="animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="ml-4 text-xs font-medium text-slate-500">{t('meeting.newMessage')}</div>
              </div>
              <div className="p-6">
                <div className="whitespace-pre-wrap text-slate-700 font-sans leading-relaxed">{analysis.followUpEmail}</div>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col-reverse sm:flex-row justify-end gap-2">
                {onSendViaGmail && (
                  <button
                    onClick={() => {
                      const subject = `Follow-up: ${meetingTitle}`;
                      onSendViaGmail(subject, analysis.followUpEmail);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 order-first sm:order-none"
                  >
                    <Mail className="w-4 h-4" />
                    {t('meeting.sendViaGmail')}
                  </button>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.followUpEmail)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm min-h-[44px] sm:min-h-0"
                >
                  {t('meeting.copyToClipboard')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
