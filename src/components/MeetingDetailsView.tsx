import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  Loader2,
  Share2,
  Languages,
  ChevronDown,
  RefreshCw,
  MessageSquare,
  Check,
  Star,
  Link,
  Edit2,
  X,
  Download,
  MoreVertical,
} from 'lucide-react';
import MediaPlayer from './MediaPlayer';
import { formatDateTime } from '../utils/format';
import MeetingDetailsTabs, { type TabId } from './MeetingDetailsTabs';
import type { AnalysisResult, Meeting } from '../types/meeting';

export type LanguageOption = { value: string; label: string };

type MeetingDetailsViewProps = {
  meeting: Meeting | null;
  analysis: AnalysisResult;
  audioUrl: string | null;
  videoUrl: string | null;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  languageOptions: LanguageOption[];
  user: { plan_id?: string; role?: string; plan_features?: { cloud_save?: boolean; pro_analysis_enabled?: boolean; video_caption?: boolean } } | null;
  usage: { languageChangesLimit?: number } | null;
  isReanalyzing: boolean;
  isSharing: boolean;
  onTranslate: (language: string) => void;
  onReanalyze: (language: string) => void;
  onShare: () => void;
  onShareLink?: () => void;
  translateDropdownOpen: boolean;
  setTranslateDropdownOpen: (open: boolean) => void;
  reanalyzeDropdownOpen: boolean;
  setReanalyzeDropdownOpen: (open: boolean) => void;
  hasAudioBlob: boolean;
  feedbackRating: number | null;
  setFeedbackRating: (r: number | null) => void;
  feedbackComment: string;
  setFeedbackComment: (c: string) => void;
  feedbackSubmitted: boolean;
  onFeedbackSubmit: () => void;
  onActionItemToggle?: (index: number, completed: boolean) => void;
  onSpeakerRename?: (original: string, newName: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => Promise<void>;
  scrollToLine?: number;
};

export default function MeetingDetailsView({
  meeting,
  analysis,
  audioUrl,
  videoUrl,
  activeTab,
  onTabChange,
  languageOptions,
  user,
  usage,
  isReanalyzing,
  isSharing,
  onTranslate,
  onReanalyze,
  onShare,
  onShareLink,
  translateDropdownOpen,
  setTranslateDropdownOpen,
  reanalyzeDropdownOpen,
  setReanalyzeDropdownOpen,
  hasAudioBlob,
  feedbackRating,
  setFeedbackRating,
  feedbackComment,
  setFeedbackComment,
  feedbackSubmitted,
  onFeedbackSubmit,
  onActionItemToggle,
  onSpeakerRename,
  onUpdateTitle,
  scrollToLine,
}: MeetingDetailsViewProps) {
  const { t } = useTranslation();
  const translateDropdownRef = useRef<HTMLDivElement>(null);
  const reanalyzeDropdownRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    if (!audioUrl && !videoUrl) {
      setAudioCurrentTime(0);
      setAudioDuration(0);
    }
  }, [audioUrl, videoUrl]);
  const [, setTabBarContainerReady] = useState(false);
  const setTabBarRef = (el: HTMLDivElement | null) => {
    (tabBarRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    setTabBarContainerReady(!!el);
  };

  const exportAsMarkdown = () => {
    const md: string[] = [
      `# ${meetingTitle}\n`,
      `## ${t('meeting.executiveSummary')}\n`,
      analysis.summary || '',
      '',
      `## ${t('meeting.keyDecisions')}\n`,
      ...(analysis.keyDecisions?.map((d: any) => `- ${typeof d === 'string' ? d : d?.decision ?? ''}`) ?? []),
      '',
      `## ${t('meeting.actionItems')}\n`,
      ...(analysis.actionItems?.map((a) => `- [${a.completed ? 'x' : ' '}] ${a.task}${a.assignee ? ` (@${a.assignee})` : ''}`) ?? []),
      '',
      `## ${t('meeting.insights')}\n`,
      `**${t('meeting.sentiment')}:** ${analysis.sentiment || ''}`,
      '',
      `## ${t('meeting.transcript')}\n`,
      analysis.transcript || '',
    ];
    const blob = new Blob([md.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  const exportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>${meetingTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p, li { line-height: 1.6; }
    ul { padding-left: 1.5rem; }
  </style>
</head>
<body>
  <h1>${(meetingTitle || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
  <h2>${t('meeting.executiveSummary')}</h2>
  <p>${(analysis.summary || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
  <h2>${t('meeting.keyDecisions')}</h2>
  <ul>${(analysis.keyDecisions ?? []).map((d: any) => `<li>${String(typeof d === 'string' ? d : d?.decision ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}</ul>
  <h2>${t('meeting.actionItems')}</h2>
  <ul>${(analysis.actionItems ?? []).map((a) => `<li>${a.completed ? '[x]' : '[ ]'} ${String(a.task || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}${a.assignee ? ` (@${a.assignee})` : ''}</li>`).join('')}</ul>
  <h2>${t('meeting.insights')}</h2>
  <p><strong>${t('meeting.sentiment')}:</strong> ${(analysis.sentiment || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  <h2>${t('meeting.transcript')}</h2>
  <pre style="white-space: pre-wrap;">${(analysis.transcript || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    setExportDropdownOpen(false);
  };

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (translateDropdownRef.current && !translateDropdownRef.current.contains(e.target as Node)) {
        setTranslateDropdownOpen(false);
      }
      if (reanalyzeDropdownRef.current && !reanalyzeDropdownRef.current.contains(e.target as Node)) {
        setReanalyzeDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShareDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTranslateDropdownOpen(false);
        setReanalyzeDropdownOpen(false);
        setExportDropdownOpen(false);
        setShareDropdownOpen(false);
        setMoreDropdownOpen(false);
      }
    };
    if (translateDropdownOpen || reanalyzeDropdownOpen || exportDropdownOpen || shareDropdownOpen || moreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [translateDropdownOpen, reanalyzeDropdownOpen, exportDropdownOpen, shareDropdownOpen, moreDropdownOpen, setTranslateDropdownOpen, setReanalyzeDropdownOpen]);

  const meetingTitle = meeting?.title ?? 'Meeting Analysis';
  const meetingDate = meeting?.date ?? '';
  const currentMeetingId = meeting?.id ?? null;
  const translationCache = meeting?.translationCache ?? {};
  const analysisLanguage = meeting?.analysisLanguage ?? 'Original Language';

  const translationCount = Object.keys(translationCache).length;
  const limit = usage?.languageChangesLimit ?? 2;
  const planName = user?.plan_features?.cloud_save || user?.plan_features?.pro_analysis_enabled || user?.role === 'admin' ? 'Pro' : 'Starter';

  const handleSendViaGmail = (subject: string, body: string) => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  };

  const isPendingAnalysis = !analysis.transcript && hasAudioBlob;

  const actionBtnClass = 'flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0';
  const iconBtnClass = 'flex items-center justify-center p-2.5 sm:p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0';

  const translateDropdown = (
    <div className="absolute left-0 top-full mt-1 w-56 max-h-64 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
      {languageOptions.map((opt) => {
        const isCached = opt.value !== 'Original Language' && !!translationCache[opt.value];
        const atLimit = limit !== -1 && translationCount >= limit;
        const optDisabled = opt.value !== 'Original Language' && !isCached && atLimit;
        const isCurrent = analysisLanguage === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => {
              if (optDisabled) return;
              onTranslate(opt.value);
              setTranslateDropdownOpen(false);
              setMoreDropdownOpen(false);
            }}
            disabled={optDisabled}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between ${isCurrent ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
          >
            {opt.label}
            {optDisabled && <span className="text-xs text-slate-400">{t('meeting.limitReached')}</span>}
          </button>
        );
      })}
    </div>
  );

  const reanalyzeDropdown = (
    <div className="absolute left-0 top-full mt-1 w-56 max-h-64 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
      {languageOptions.map((opt) => {
        const isCurrent = analysisLanguage === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => {
              onReanalyze(opt.value);
              setReanalyzeDropdownOpen(false);
              setMoreDropdownOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${isCurrent ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const exportDropdown = (
    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
      <button onClick={() => { exportAsMarkdown(); setMoreDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
        {t('meeting.exportAsMarkdown')}
      </button>
      <button onClick={() => { exportAsPdf(); setMoreDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
        {t('meeting.exportAsPdf')}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/50 p-4 sm:p-6">
          {isPendingAnalysis && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-amber-800">{t('recording.audioReadyForAnalysis')}</p>
              <button
                onClick={() => onReanalyze(analysisLanguage || 'Original Language')}
                disabled={isReanalyzing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px] sm:min-h-0"
              >
                {isReanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {t('recording.analyzeMeeting')}
              </button>
            </div>
          )}

          {/* Zone 1: Title + date | Primary actions (Share, Export) */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditingTitle && currentMeetingId && onUpdateTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = editTitleValue.trim();
                          if (v) onUpdateTitle(currentMeetingId, v).then(() => setIsEditingTitle(false));
                        }
                        if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setEditTitleValue(meetingTitle);
                        }
                      }}
                      autoFocus
                      className="flex-1 min-w-0 px-3 py-2 sm:py-1.5 text-xl font-semibold border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={() => { const v = editTitleValue.trim(); if (v) onUpdateTitle(currentMeetingId, v).then(() => setIsEditingTitle(false)); }} className="p-2.5 sm:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0 min-h-[44px] sm:min-h-0" title={t('history.save')}><Check className="w-5 h-5" /></button>
                    <button onClick={() => { setIsEditingTitle(false); setEditTitleValue(meetingTitle); }} className="p-2.5 sm:p-2 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0 min-h-[44px] sm:min-h-0" title={t('history.cancel')}><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{meetingTitle}</h2>
                    {currentMeetingId && onUpdateTitle && (
                      <button onClick={() => { setEditTitleValue(meetingTitle); setIsEditingTitle(true); }} className="p-2.5 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0 min-h-[44px] sm:min-h-0" title={t('history.editTitle')} aria-label={t('history.editTitle')}><Edit2 className="w-4 h-4" /></button>
                    )}
                  </div>
                )}
                <p className="text-sm text-slate-500 mt-1">{currentMeetingId ? formatDateTime(meetingDate) : t('meeting.generatedFromRecording')}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative" ref={shareDropdownRef}>
                  {onShareLink ? (
                    <>
                      <button disabled={isSharing} onClick={() => setShareDropdownOpen(!shareDropdownOpen)} className={`${iconBtnClass} sm:gap-2 sm:px-3 sm:min-w-0 sm:min-h-0 ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`} title={t('meeting.share')}>
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('meeting.share')}</span>
                        <ChevronDown className={`w-4 h-4 shrink-0 hidden sm:block transition-transform ${shareDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {shareDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                          <button onClick={() => { onShareLink(); setShareDropdownOpen(false); }} disabled={isSharing} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 text-slate-700"><Link className="w-4 h-4" />{t('meeting.copyShareLink')}</button>
                          <button onClick={() => { onShare(); setShareDropdownOpen(false); }} disabled={isSharing} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 text-slate-700"><Share2 className="w-4 h-4" />{t('meeting.copyNotes')}</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <button disabled={isSharing} onClick={onShare} className={`${iconBtnClass} sm:gap-2 sm:px-3 sm:min-w-0 sm:min-h-0 ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`} title={t('meeting.share')}><Share2 className="w-4 h-4" /><span className="hidden sm:inline">{t('meeting.share')}</span></button>
                  )}
                </div>
                <div className="relative sm:hidden" ref={moreDropdownRef}>
                  <button onClick={() => setMoreDropdownOpen(!moreDropdownOpen)} className={iconBtnClass} title={t('meeting.export')} aria-label="More actions"><MoreVertical className="w-5 h-5" /></button>
                  {moreDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                      <div className="relative" ref={translateDropdownRef}>
                        <button onClick={() => user && !isReanalyzing && setTranslateDropdownOpen(!translateDropdownOpen)} disabled={isReanalyzing || !user} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700 disabled:opacity-50 min-h-[44px]">
                          <Languages className="w-4 h-4" />{t('meeting.translateTo')}<ChevronDown className={`ml-auto ${translateDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {translateDropdownOpen && translateDropdown}
                      </div>
                      <div className="relative" ref={reanalyzeDropdownRef}>
                        <button onClick={() => hasAudioBlob && !isReanalyzing && setReanalyzeDropdownOpen(!reanalyzeDropdownOpen)} disabled={isReanalyzing || !hasAudioBlob} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700 disabled:opacity-50 min-h-[44px]">
                          <RefreshCw className="w-4 h-4" />{t('meeting.reanalyzeTo')}<ChevronDown className={`ml-auto ${reanalyzeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {reanalyzeDropdownOpen && reanalyzeDropdown}
                      </div>
                      <div className="border-t border-slate-100" />
                      <button onClick={() => { exportAsMarkdown(); setMoreDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700 min-h-[44px]">{t('meeting.exportAsMarkdown')}</button>
                      <button onClick={() => { exportAsPdf(); setMoreDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700 min-h-[44px]">{t('meeting.exportAsPdf')}</button>
                    </div>
                  )}
                </div>
                <div className="relative hidden sm:block" ref={exportDropdownRef}>
                  <button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className={actionBtnClass}><Download className="w-4 h-4" />{t('meeting.export')}<ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} /></button>
                  {exportDropdownOpen && exportDropdown}
                </div>
              </div>
            </div>

            {/* Zone 2: Translate, Reanalyze, translation count - hidden in More on mobile */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/50">
              <div className="relative" ref={translateDropdownRef}>
                <button onClick={() => user && !isReanalyzing && setTranslateDropdownOpen(!translateDropdownOpen)} disabled={isReanalyzing || !user} title={!user ? t('meeting.signInToTranslate') : t('meeting.translateTooltip')} className={actionBtnClass}>
                  <Languages className="w-4 h-4 shrink-0" />{t('meeting.translateTo')}<ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${translateDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {translateDropdownOpen && translateDropdown}
                {isReanalyzing && <Loader2 className="absolute -right-1 -top-1 w-4 h-4 text-indigo-600 animate-spin" />}
              </div>
              <div className="relative" ref={reanalyzeDropdownRef}>
                <button onClick={() => hasAudioBlob && !isReanalyzing && setReanalyzeDropdownOpen(!reanalyzeDropdownOpen)} disabled={isReanalyzing || !hasAudioBlob} title={!hasAudioBlob ? t('meeting.enableStoreAudio') : t('meeting.reanalyzeTooltip')} className={actionBtnClass}>
                  <RefreshCw className="w-4 h-4 shrink-0" />{t('meeting.reanalyzeTo')}<ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${reanalyzeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {reanalyzeDropdownOpen && reanalyzeDropdown}
              </div>
              <span className="text-xs text-slate-500">{limit === -1 ? t('meeting.unlimitedTranslations') : t('meeting.translationsCount', { count: translationCount, limit, plan: planName })}</span>
            </div>

            {/* At a glance: single row, no duplicate sentiment */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-slate-200/50">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mr-1">{t('meeting.atAGlance')}:</span>
              {analysis.sentiment && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-600">{t('meeting.sentiment')}</span>
                  <span className="text-sm font-semibold text-indigo-600">{analysis.sentiment}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-sm font-medium text-slate-600">{t('meeting.actionItemsCount', { count: analysis.actionItems?.length ?? 0 })}</span>
              </div>
            </div>

            {(audioUrl || videoUrl) && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <Mic className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">{t('meeting.meetingRecording')}</span>
                </div>
                <MediaPlayer
                  audioUrl={audioUrl}
                  videoUrl={videoUrl}
                  downloadFilename={meeting ? `${meeting.title}_${meeting.date}` : 'recording'}
                  onTimeUpdate={setAudioCurrentTime}
                  onDurationChange={setAudioDuration}
                  mediaRef={mediaRef}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sticky tab bar - rendered via portal from MeetingDetailsTabs */}
        <div ref={setTabBarRef} className="bg-white" />
      </div>

      <MeetingDetailsTabs
        analysis={analysis}
        activeTab={activeTab}
        onTabChange={onTabChange}
        meetingTitle={meetingTitle}
        onSendViaGmail={handleSendViaGmail}
        showBadges={true}
        onActionItemToggle={onActionItemToggle}
        onSpeakerRename={onSpeakerRename}
        tabBarRef={tabBarRef}
        audioCurrentTime={audioCurrentTime}
        audioDuration={audioDuration}
        hasAudioOrVideo={!!(audioUrl || videoUrl)}
        seekTo={(seconds) => {
          const el = mediaRef.current;
          if (el) el.currentTime = seconds;
        }}
        scrollToLine={scrollToLine}
      />

      {currentMeetingId && user && (
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-200 px-4 sm:px-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto overflow-hidden">
            <button
              type="button"
              onClick={() => !feedbackSubmitted && setFeedbackExpanded((p) => !p)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/50 transition-colors min-h-[44px] disabled:cursor-default"
              aria-expanded={feedbackExpanded}
              disabled={feedbackSubmitted}
            >
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                {feedbackSubmitted ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    {t('meeting.thankYouFeedback')}
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 text-indigo-500 shrink-0" />
                    {t('meeting.helpUsImprove')}
                  </>
                )}
              </h3>
              {!feedbackSubmitted && (
                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${feedbackExpanded ? 'rotate-180' : ''}`} />
              )}
            </button>

            {(feedbackExpanded || feedbackSubmitted) && (
            <div className="px-4 sm:p-6 pt-0 sm:pt-0 pb-4 sm:pb-6 border-t border-slate-100">
            {feedbackSubmitted ? (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
                <Check className="w-5 h-5" />
                <p className="font-medium">{t('meeting.thankYouFeedback')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('meeting.rateAnalysis')}</label>
                  <div className="flex gap-1" role="group" aria-label={t('meeting.rateAnalysis')}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = feedbackRating != null && feedbackRating >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          aria-label={t('meeting.starLabel', { count: star })}
                          aria-pressed={feedbackRating === star}
                          className="p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-lg transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 flex items-center justify-center"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${isFilled ? 'fill-amber-500 text-amber-500' : 'fill-none text-slate-300'}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t('meeting.ratingHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('meeting.whatCouldBeBetter')}</label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder={t('meeting.feedbackPlaceholder')}
                    className="w-full h-24 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  onClick={onFeedbackSubmit}
                  disabled={!feedbackRating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  {t('meeting.submitFeedback')}
                </button>
              </div>
            )}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
