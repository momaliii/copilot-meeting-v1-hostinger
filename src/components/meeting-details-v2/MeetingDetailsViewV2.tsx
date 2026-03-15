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
import MediaPlayer from '../MediaPlayer';
import { formatDateTime } from '../../utils/format';
import MeetingDetailsTabsV2 from './MeetingDetailsTabsV2';
import type { TabId } from '../MeetingDetailsTabs';
import type { AnalysisResult, Meeting } from '../../types/meeting';

export type LanguageOption = { value: string; label: string };

type MeetingDetailsViewV2Props = {
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
  onGetShareLink?: () => Promise<string | null>;
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
  onTranscriptEdit?: (newTranscript: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => Promise<void>;
  scrollToLine?: number;
  googleConnected?: boolean;
  smtpAvailable?: boolean;
  onRefetchGoogleStatus?: () => void;
};

export default function MeetingDetailsViewV2(props: MeetingDetailsViewV2Props) {
  const {
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
    onGetShareLink,
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
    onTranscriptEdit,
    onUpdateTitle,
    scrollToLine,
    googleConnected = false,
    smtpAvailable = false,
    onRefetchGoogleStatus,
  } = props;

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

  const setTabBarRef = (el: HTMLDivElement | null) => {
    (tabBarRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const meetingTitle = meeting?.title ?? 'Meeting Analysis';
  const meetingDate = meeting?.date ?? '';
  const currentMeetingId = meeting?.id ?? null;
  const translationCache = meeting?.translationCache ?? {};
  const analysisLanguage = meeting?.analysisLanguage ?? 'Original Language';

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
    setMoreDropdownOpen(false);
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
    setMoreDropdownOpen(false);
  };

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (translateDropdownRef.current && !translateDropdownRef.current.contains(e.target as Node)) setTranslateDropdownOpen(false);
      if (reanalyzeDropdownRef.current && !reanalyzeDropdownRef.current.contains(e.target as Node)) setReanalyzeDropdownOpen(false);
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) setExportDropdownOpen(false);
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) setShareDropdownOpen(false);
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) setMoreDropdownOpen(false);
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

  const handleSendViaGmail = (subject: string, body: string) => {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const isPendingAnalysis = !analysis.transcript && hasAudioBlob;

  const iconBtnClass = 'flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors min-w-[36px] min-h-[36px]';

  const translateDropdown = (
    <div className="absolute left-0 top-full mt-1 w-52 max-h-64 overflow-y-auto bg-white rounded-lg shadow-md border border-slate-100 py-1 z-50">
      {languageOptions.map((opt) => {
        const isCached = opt.value !== 'Original Language' && !!translationCache[opt.value];
        const atLimit = (usage?.languageChangesLimit ?? 2) !== -1 && Object.keys(translationCache).length >= (usage?.languageChangesLimit ?? 2);
        const optDisabled = opt.value !== 'Original Language' && !isCached && atLimit;
        const isCurrent = analysisLanguage === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => { if (optDisabled) return; onTranslate(opt.value); setTranslateDropdownOpen(false); setMoreDropdownOpen(false); }}
            disabled={optDisabled}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center justify-between ${isCurrent ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}
          >
            {opt.label}
            {optDisabled && <span className="text-xs text-slate-400">{t('meeting.limitReached')}</span>}
          </button>
        );
      })}
    </div>
  );

  const reanalyzeDropdown = (
    <div className="absolute left-0 top-full mt-1 w-52 max-h-64 overflow-y-auto bg-white rounded-lg shadow-md border border-slate-100 py-1 z-50">
      {languageOptions.map((opt) => {
        const isCurrent = analysisLanguage === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => { onReanalyze(opt.value); setReanalyzeDropdownOpen(false); setMoreDropdownOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${isCurrent ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const exportDropdown = (
    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-md border border-slate-100 py-1 z-50">
      <button onClick={() => { exportAsMarkdown(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-600">{t('meeting.exportAsMarkdown')}</button>
      <button onClick={() => { exportAsPdf(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-600">{t('meeting.exportAsPdf')}</button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="p-4 sm:p-6">
          {isPendingAnalysis && (
            <div className="mb-4 p-4 bg-amber-50/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-amber-800">{t('recording.audioReadyForAnalysis')}</p>
              <button
                onClick={() => onReanalyze(analysisLanguage || 'Original Language')}
                disabled={isReanalyzing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isReanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {t('recording.analyzeMeeting')}
              </button>
            </div>
          )}

          {/* Compact header: title + date | icon actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditingTitle && currentMeetingId && onUpdateTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { const v = editTitleValue.trim(); if (v) onUpdateTitle(currentMeetingId, v).then(() => setIsEditingTitle(false)); }
                      if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitleValue(meetingTitle); }
                    }}
                    autoFocus
                    className="flex-1 min-w-0 px-3 py-2 text-lg font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button onClick={() => { const v = editTitleValue.trim(); if (v) onUpdateTitle(currentMeetingId, v).then(() => setIsEditingTitle(false)); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title={t('history.save')}><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setIsEditingTitle(false); setEditTitleValue(meetingTitle); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg" title={t('history.cancel')}><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-800">{meetingTitle}</h2>
                  {currentMeetingId && onUpdateTitle && (
                    <button onClick={() => { setEditTitleValue(meetingTitle); setIsEditingTitle(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg" title={t('history.editTitle')}><Edit2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-500 mt-0.5">{currentMeetingId ? formatDateTime(meetingDate) : t('meeting.generatedFromRecording')}</p>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative" ref={shareDropdownRef}>
                {onShareLink ? (
                  <>
                    <button disabled={isSharing} onClick={() => setShareDropdownOpen(!shareDropdownOpen)} className={`${iconBtnClass} ${isSharing ? 'opacity-50' : ''}`} title={t('meeting.share')}>
                      <Share2 className="w-4 h-4" />
                      <ChevronDown className={`w-3 h-3 ml-0.5 ${shareDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {shareDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-md border border-slate-100 py-1 z-50">
                        <button onClick={() => { onShareLink(); setShareDropdownOpen(false); }} disabled={isSharing} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-600 disabled:opacity-50"><Link className="w-3.5 h-3.5" />{t('meeting.copyShareLink')}</button>
                        <button onClick={() => { onShare(); setShareDropdownOpen(false); }} disabled={isSharing} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-600 disabled:opacity-50"><Share2 className="w-3.5 h-3.5" />{t('meeting.copyNotes')}</button>
                      </div>
                    )}
                  </>
                ) : (
                  <button disabled={isSharing} onClick={onShare} className={`${iconBtnClass} ${isSharing ? 'opacity-50' : ''}`} title={t('meeting.share')}><Share2 className="w-4 h-4" /></button>
                )}
              </div>
              <div className="relative" ref={exportDropdownRef}>
                <button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className={iconBtnClass} title={t('meeting.export')}><Download className="w-4 h-4" /></button>
                {exportDropdownOpen && exportDropdown}
              </div>
              <div className="relative" ref={moreDropdownRef}>
                <button onClick={() => setMoreDropdownOpen(!moreDropdownOpen)} className={iconBtnClass} title="More" aria-label="More actions"><MoreVertical className="w-4 h-4" /></button>
                {moreDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-md border border-slate-100 py-1 z-50">
                    <div className="relative" ref={translateDropdownRef}>
                      <button onClick={() => user && !isReanalyzing && setTranslateDropdownOpen(!translateDropdownOpen)} disabled={isReanalyzing || !user} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-600 disabled:opacity-50">
                        <Languages className="w-3.5 h-3.5" />{t('meeting.translateTo')}<ChevronDown className={`ml-auto w-3 h-3 ${translateDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {translateDropdownOpen && translateDropdown}
                    </div>
                    <div className="relative" ref={reanalyzeDropdownRef}>
                      <button onClick={() => hasAudioBlob && !isReanalyzing && setReanalyzeDropdownOpen(!reanalyzeDropdownOpen)} disabled={isReanalyzing || !hasAudioBlob} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-600 disabled:opacity-50">
                        <RefreshCw className="w-3.5 h-3.5" />{t('meeting.reanalyzeTo')}<ChevronDown className={`ml-auto w-3 h-3 ${reanalyzeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {reanalyzeDropdownOpen && reanalyzeDropdown}
                    </div>
                    <div className="border-t border-slate-100 my-1" />
                    <button onClick={exportAsMarkdown} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-600">{t('meeting.exportAsMarkdown')}</button>
                    <button onClick={exportAsPdf} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-600">{t('meeting.exportAsPdf')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* At a glance: soft pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('meeting.atAGlance')}:</span>
            {analysis.sentiment && (
              <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg text-sm text-slate-600">
                <span className="font-medium">{t('meeting.sentiment')}</span>
                <span className="font-semibold text-indigo-600">{analysis.sentiment}</span>
              </span>
            )}
            <span className="inline-flex items-center bg-slate-50 px-2.5 py-1 rounded-lg text-sm text-slate-600">
              {t('meeting.actionItemsCount', { count: analysis.actionItems?.length ?? 0 })}
            </span>
          </div>

          {(audioUrl || videoUrl) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-600">{t('meeting.meetingRecording')}</span>
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

        <div ref={setTabBarRef} className="bg-white" />
      </div>

      <MeetingDetailsTabsV2
        analysis={analysis}
        activeTab={activeTab}
        onTabChange={onTabChange}
        meetingTitle={meetingTitle}
        googleConnected={googleConnected}
        smtpAvailable={smtpAvailable}
        onSendViaGmail={handleSendViaGmail}
        onRefetchGoogleStatus={onRefetchGoogleStatus}
        onGetShareLink={onGetShareLink}
        showBadges={true}
        onActionItemToggle={onActionItemToggle}
        onSpeakerRename={onSpeakerRename}
        onTranscriptEdit={onTranscriptEdit}
        tabBarRef={tabBarRef}
        audioCurrentTime={audioCurrentTime}
        audioDuration={audioDuration}
        hasAudioOrVideo={!!(audioUrl || videoUrl)}
        seekTo={(seconds) => { const el = mediaRef.current; if (el) el.currentTime = seconds; }}
        scrollToLine={scrollToLine}
      />

      {currentMeetingId && user && (
        <div className="mt-8 pt-6 border-t border-slate-100 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => !feedbackSubmitted && setFeedbackExpanded((p) => !p)}
              className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50/50 rounded-lg px-3 transition-colors disabled:cursor-default"
              aria-expanded={feedbackExpanded}
              disabled={feedbackSubmitted}
            >
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                {feedbackSubmitted ? (
                  <><Check className="w-4 h-4 text-emerald-500" />{t('meeting.thankYouFeedback')}</>
                ) : (
                  <><MessageSquare className="w-4 h-4 text-indigo-500" />{t('meeting.helpUsImprove')}</>
                )}
              </h3>
              {!feedbackSubmitted && <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${feedbackExpanded ? 'rotate-180' : ''}`} />}
            </button>

            {(feedbackExpanded || feedbackSubmitted) && (
              <div className="pt-2 pb-4 border-t border-slate-100">
                {feedbackSubmitted ? (
                  <div className="bg-emerald-50/80 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4" />
                    <p className="font-medium">{t('meeting.thankYouFeedback')}</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">{t('meeting.rateAnalysis')}</label>
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
                              className="p-1.5 rounded-lg transition-colors hover:bg-amber-50 flex items-center justify-center"
                            >
                              <Star className={`w-5 h-5 ${isFilled ? 'fill-amber-500 text-amber-500' : 'fill-none text-slate-300'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">{t('meeting.whatCouldBeBetter')}</label>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder={t('meeting.feedbackPlaceholder')}
                        className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <button
                      onClick={onFeedbackSubmit}
                      disabled={!feedbackRating}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-2 rounded-lg transition-colors text-sm"
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
