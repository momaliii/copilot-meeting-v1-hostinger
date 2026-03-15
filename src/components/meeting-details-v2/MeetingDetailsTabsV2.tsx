import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../AuthContext';
import { FileText, CheckSquare, Users, Mail, Lightbulb, AlertTriangle, HelpCircle, Activity, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { AnalysisResult } from '../../types/meeting';
import TranscriptPanel from '../transcript/TranscriptPanel';
import type { TabId } from '../MeetingDetailsTabs';

export type EmailTemplate = 'followUp' | 'actionItems' | 'fullMeeting';

type MeetingDetailsTabsV2Props = {
  analysis: AnalysisResult;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  meetingTitle?: string;
  googleConnected?: boolean;
  smtpAvailable?: boolean;
  onSendViaGmail?: (subject: string, body: string) => void;
  onRefetchGoogleStatus?: () => void;
  onGetShareLink?: () => Promise<string | null>;
  showBadges?: boolean;
  onActionItemToggle?: (index: number, completed: boolean) => void;
  onSpeakerRename?: (original: string, newName: string) => void;
  onTranscriptEdit?: (newTranscript: string) => void;
  tabBarRef?: React.RefObject<HTMLDivElement | null>;
  audioCurrentTime?: number;
  audioDuration?: number;
  hasAudioOrVideo?: boolean;
  seekTo?: (seconds: number) => void;
  scrollToLine?: number;
};

function buildEmailBody(
  template: EmailTemplate,
  analysis: AnalysisResult,
  t: (key: string) => string,
  shareLink?: string | null
): string {
  let body: string;
  switch (template) {
    case 'followUp':
      body = analysis.followUpEmail || '';
      break;
    case 'actionItems': {
      const items = (analysis.actionItems ?? [])
        .map((a) => `- ${a.task}${a.assignee ? ` (${a.assignee})` : ''}`)
        .join('\n');
      body = `${analysis.summary}\n\n${t('meeting.actionItems')}:\n${items || t('meeting.noActionItems')}`;
      break;
    }
    case 'fullMeeting': {
      const items = (analysis.actionItems ?? [])
        .map((a) => `- ${a.task}${a.assignee ? ` (${a.assignee})` : ''}`)
        .join('\n');
      const decisions = (analysis.keyDecisions ?? [])
        .map((d) => `- ${typeof d === 'string' ? d : (d as { decision?: string }).decision || ''}`)
        .join('\n');
      body = `${analysis.summary}\n\n${t('meeting.keyDecisions')}:\n${decisions || '-'}\n\n${t('meeting.actionItems')}:\n${items || t('meeting.noActionItems')}`;
      break;
    }
    default:
      body = analysis.followUpEmail || '';
  }
  if (shareLink) {
    body += `\n\n${t('meeting.viewMeetingDetails')}\n${shareLink}`;
  }
  return body;
}

export default function MeetingDetailsTabsV2({
  analysis,
  activeTab,
  onTabChange,
  meetingTitle = 'Meeting',
  googleConnected = false,
  smtpAvailable = false,
  onSendViaGmail,
  onRefetchGoogleStatus,
  onGetShareLink,
  showBadges = false,
  onActionItemToggle,
  onSpeakerRename,
  onTranscriptEdit,
  tabBarRef,
  audioCurrentTime = 0,
  audioDuration = 0,
  hasAudioOrVideo = false,
  seekTo,
  scrollToLine,
}: MeetingDetailsTabsV2Props) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [recipients, setRecipients] = useState('');
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>('followUp');
  const [includeMeetingLink, setIncludeMeetingLink] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendToast, setSendToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const transcriptTurnCount = useMemo(() => {
    return analysis.transcript?.split('\n').filter(l => l.trim() && l.match(/^(.+?):\s*(.*)/)).length ?? 0;
  }, [analysis.transcript]);

  useEffect(() => {
    if (activeTab === 'email' && onRefetchGoogleStatus) {
      onRefetchGoogleStatus();
    }
  }, [activeTab, onRefetchGoogleStatus]);

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'summary', label: t('meeting.summary'), icon: FileText },
    { id: 'insights', label: t('meeting.insights'), icon: Lightbulb },
    { id: 'actionItems', label: t('meeting.actionItems'), icon: CheckSquare, badge: analysis.actionItems?.length ?? 0 },
    { id: 'transcript', label: t('meeting.transcript'), icon: Users, badge: showBadges ? transcriptTurnCount : undefined },
    { id: 'email', label: t('meeting.followUpEmail'), icon: Mail },
  ];

  const tabBar = (
    <div className="flex overflow-x-auto border-b border-slate-100 hide-scrollbar scroll-smooth snap-x snap-mandatory" role="tablist" aria-label={t('meeting.summary')}>
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
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-600 hover:border-slate-200'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {tab.label}
            {showBadges && tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-slate-100 text-slate-500 py-0.5 px-1.5 rounded-full text-xs">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {tabBarRef?.current && typeof document !== 'undefined' ? createPortal(tabBar, tabBarRef.current) : tabBar}

      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
        {activeTab === 'summary' && (
          <div id="panel-summary" role="tabpanel" aria-labelledby="tab-summary" className="animate-in fade-in space-y-8">
            <div>
              <h3 className="text-base font-semibold mb-3 pl-3 border-l-2 border-slate-300 text-slate-700">
                {t('meeting.executiveSummary')}
                {analysis.summaryConfidence !== undefined && (
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    {t('meeting.confidence', { value: analysis.summaryConfidence })}
                  </span>
                )}
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap pl-3">{analysis.summary}</p>
            </div>

            {analysis.keyDecisions && analysis.keyDecisions.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-base font-semibold mb-3 pl-3 border-l-2 border-slate-300 text-slate-700">{t('meeting.keyDecisions')}</h3>
                <ol className="space-y-2 pl-3 list-decimal list-inside">
                  {analysis.keyDecisions.map((item, i) => {
                    const decisionText = typeof item === 'string' ? item : item.decision;
                    const confidence = typeof item === 'object' && item.confidence ? item.confidence : null;
                    return (
                      <li key={i} className="text-slate-600">
                        <span>{decisionText}</span>
                        {confidence !== null && (
                          <span className="ml-2 text-xs text-slate-400">{t('meeting.confidence', { value: confidence })}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div id="panel-insights" role="tabpanel" aria-labelledby="tab-insights" className="space-y-8 animate-in fade-in">
            {analysis.sentimentTrend && analysis.sentimentTrend.length > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-3 pl-3 border-l-2 border-slate-300 text-slate-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  {t('meeting.sentimentTrend')}
                </h3>
                <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-xl">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysis.sentimentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="timeSegment" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                        <YAxis domain={[-100, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                          labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                          formatter={(value: number) => [
                            <span key="val" style={{ color: value > 0 ? '#10b981' : value < 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                              {value}
                            </span>,
                            t('meeting.score'),
                          ]}
                        />
                        <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#fff' }}
                          activeDot={{ r: 5, fill: '#4f46e5', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {analysis.sentimentTrend.map((trend, i) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-white/60">
                        <div className="text-xs text-slate-500 mb-1">{trend.timeSegment}</div>
                        <div className="font-medium text-sm text-slate-700">{trend.sentiment}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analysis.topics && analysis.topics.length > 0 && (
              <div className={analysis.sentimentTrend && analysis.sentimentTrend.length > 0 ? 'pt-6 border-t border-slate-100' : ''}>
                <h3 className="text-base font-semibold mb-3 pl-3 border-l-2 border-slate-300 text-slate-700 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  {t('meeting.keyTopicsDiscussed')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.topics.map((topic, i) => (
                    <div key={i} className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <span className="font-medium text-slate-700 text-sm">{topic.name}</span>
                      {topic.confidence !== undefined && (
                        <span className="ml-2 text-xs text-slate-400">{topic.confidence}%</span>
                      )}
                      {topic.description && (
                        <p className="text-xs text-slate-500 mt-1">{topic.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.risks && analysis.risks.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-base font-semibold mb-3 pl-3 border-l-2 border-slate-300 text-slate-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  {t('meeting.risksBlockers')}
                </h3>
                <ul className="space-y-2">
                  {analysis.risks.map((item, i) => {
                    const riskText = typeof item === 'string' ? item : item.risk;
                    const confidence = typeof item === 'object' && item.confidence ? item.confidence : null;
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700 pl-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                        <span>{riskText}</span>
                        {confidence !== null && (
                          <span className="text-xs text-red-500">{t('meeting.confidence', { value: confidence })}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {analysis.questions && analysis.questions.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-base font-semibold mb-3 pl-3 border-l-2 border-slate-300 text-slate-700 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  {t('meeting.keyQuestionsRaised')}
                </h3>
                <ul className="space-y-2">
                  {analysis.questions.map((item, i) => {
                    const questionText = typeof item === 'string' ? item : item.question;
                    const confidence = typeof item === 'object' && item.confidence ? item.confidence : null;
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-700 pl-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                        <span>{questionText}</span>
                        {confidence !== null && (
                          <span className="text-xs text-blue-500">{t('meeting.confidence', { value: confidence })}</span>
                        )}
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
              <div className="space-y-2">
                {(analysis.actionItems ?? []).map((item, i) => {
                  const completed = item.completed ?? false;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-4 py-3 px-2 rounded-lg hover:bg-slate-50/50 transition-colors group"
                    >
                      <div className="mt-0.5">
                        {onActionItemToggle ? (
                          <button
                            onClick={() => onActionItemToggle(i, !completed)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              completed ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'
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
                          <div className="w-5 h-5 rounded border-2 border-slate-300" />
                        )}
                      </div>
                      <div className={`flex-1 ${completed ? 'opacity-60 line-through' : ''}`}>
                        <p className="text-slate-700 font-medium">
                          {item.task}
                          {item.confidence !== undefined && (
                            <span className="ml-2 text-xs text-slate-400">{item.confidence}%</span>
                          )}
                        </p>
                        {item.assignee && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {item.assignee.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-slate-500">{t('meeting.assignedTo', { name: item.assignee })}</span>
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
          <div id="panel-transcript" role="tabpanel" aria-labelledby="tab-transcript" className="animate-in fade-in">
            <TranscriptPanel
              analysis={analysis}
              meetingTitle={meetingTitle}
              audioCurrentTime={audioCurrentTime}
              audioDuration={audioDuration}
              hasAudioOrVideo={hasAudioOrVideo}
              seekTo={seekTo}
              scrollToLine={scrollToLine}
              onSpeakerRename={onSpeakerRename}
              onTranscriptEdit={onTranscriptEdit}
              variant="minimal"
            />
          </div>
        )}

        {activeTab === 'email' && (
          <div id="panel-email" role="tabpanel" aria-labelledby="tab-email" className="animate-in fade-in space-y-4">
            {(googleConnected || smtpAvailable) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('meeting.emailTemplate')}</label>
                  <select
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value as EmailTemplate)}
                    className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="followUp">{t('meeting.emailTemplateFollowUp')}</option>
                    <option value="actionItems">{t('meeting.emailTemplateActionItems')}</option>
                    <option value="fullMeeting">{t('meeting.emailTemplateFullMeeting')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('meeting.recipientsLabel')}</label>
                  <input
                    type="text"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder={t('meeting.recipientsPlaceholder')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
            {onGetShareLink && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMeetingLink}
                  onChange={(e) => setIncludeMeetingLink(e.target.checked)}
                  className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">{t('meeting.includeMeetingLink')}</span>
              </label>
            )}
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-white/60 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                </div>
                <div className="ml-3 text-xs text-slate-500">{t('meeting.newMessage')}</div>
              </div>
              <div className="p-5">
                <div className="whitespace-pre-wrap text-slate-600 font-sans leading-relaxed text-sm">
                  {buildEmailBody(emailTemplate, analysis, t, includeMeetingLink ? undefined : null)}
                </div>
              </div>
              <div className="bg-white/60 border-t border-slate-100 px-4 py-2.5 flex flex-col-reverse sm:flex-row justify-end gap-2">
                {onSendViaGmail && (
                  <button
                    onClick={async () => {
                      const subject =
                        emailTemplate === 'followUp'
                          ? `Follow-up: ${meetingTitle}`
                          : emailTemplate === 'actionItems'
                            ? `Action items: ${meetingTitle}`
                            : `Meeting notes: ${meetingTitle}`;
                      let shareLink: string | null = null;
                      if (includeMeetingLink && onGetShareLink) {
                        try {
                          shareLink = await onGetShareLink();
                        } catch {
                          // ignore
                        }
                      }
                      const body = buildEmailBody(emailTemplate, analysis, t, shareLink);
                      const toList = recipients.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
                      if (googleConnected || smtpAvailable) {
                        if (toList.length === 0) {
                          setSendToast({ message: t('meeting.recipientsRequired'), type: 'error' });
                          setTimeout(() => setSendToast(null), 3000);
                          return;
                        }
                        setIsSending(true);
                        try {
                          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                          if (token) headers.Authorization = `Bearer ${token}`;
                          const apiUrl = googleConnected ? '/api/google/gmail/send' : '/api/email/send';
                          const res = await fetch(apiUrl, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ to: toList, subject, body }) });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) setSendToast({ message: data.error || t('meeting.emailSendFailed'), type: 'error' });
                          else setSendToast({ message: t('meeting.emailSent'), type: 'success' });
                        } catch (err: any) {
                          setSendToast({ message: err.message || t('meeting.emailSendFailed'), type: 'error' });
                        } finally {
                          setIsSending(false);
                          setTimeout(() => setSendToast(null), 3000);
                        }
                      } else {
                        onSendViaGmail(subject, body);
                      }
                    }}
                    disabled={isSending}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 order-first sm:order-none"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {t('meeting.sendViaGmail')}
                  </button>
                )}
                <button
                  onClick={async () => {
                    let shareLink: string | null = null;
                    if (includeMeetingLink && onGetShareLink) {
                      try { shareLink = await onGetShareLink(); } catch {}
                    }
                    navigator.clipboard.writeText(buildEmailBody(emailTemplate, analysis, t, shareLink));
                  }}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] sm:min-h-0"
                >
                  {t('meeting.copyToClipboard')}
                </button>
              </div>
            </div>
            {sendToast && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${sendToast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {sendToast.message}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
