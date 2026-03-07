import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Filter, Star, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import type { FeedbackRow, AdminPermissions } from '../../types/admin';

const TableSkeleton = ({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-start text-sm">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-6 py-3"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /></th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {Array.from({ length: rows }).map((_, ri) => (
          <tr key={ri}>
            {Array.from({ length: cols }).map((_, ci) => (
              <td key={ci} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: ci === 0 ? 120 : 80 }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

type AdminFeedbackViewProps = {
  feedback: FeedbackRow[];
  moderationQueue: FeedbackRow[];
  loading: boolean;
  moderationLoading: boolean;
  error: string | null;
  moderationError: string | null;
  feedbackPage: number;
  feedbackTotalPages: number;
  feedbackStatus: string;
  feedbackRating: string;
  feedbackFrom: string;
  feedbackTo: string;
  expandedFeedbackId: string | null;
  moderationNotes: Record<string, string>;
  currentPermissions: AdminPermissions;
  onStatusFilterChange: (v: string) => void;
  onRatingFilterChange: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onPageChange: (page: number) => void;
  onExpandFeedback: (id: string | null) => void;
  onModerationNotesChange: (id: string, notes: string) => void;
  onReviewFeedback: (id: string, decision: 'accepted' | 'rejected') => void;
};

export default function AdminFeedbackView({
  feedback,
  moderationQueue,
  loading,
  moderationLoading,
  error,
  moderationError,
  feedbackPage,
  feedbackTotalPages,
  feedbackStatus,
  feedbackRating,
  feedbackFrom,
  feedbackTo,
  expandedFeedbackId,
  moderationNotes,
  currentPermissions,
  onStatusFilterChange,
  onRatingFilterChange,
  onFromChange,
  onToChange,
  onPageChange,
  onExpandFeedback,
  onModerationNotesChange,
  onReviewFeedback,
}: AdminFeedbackViewProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.userFeedback')}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={feedbackStatus} onChange={(e) => onStatusFilterChange(e.target.value)} className="border border-slate-200 rounded px-2 py-1">
              <option value="">{t('admin.allStatusesFilter')}</option>
              <option value="pending">{t('admin.pending')}</option>
              <option value="accepted">{t('admin.accepted')}</option>
              <option value="rejected">{t('admin.rejected')}</option>
            </select>
            <select value={feedbackRating} onChange={(e) => onRatingFilterChange(e.target.value)} className="border border-slate-200 rounded px-2 py-1">
              <option value="">{t('admin.allRatings')}</option>
              <option value="1">1★</option>
              <option value="2">2★</option>
              <option value="3">3★</option>
              <option value="4">4★</option>
              <option value="5">5★</option>
            </select>
            <input type="date" value={feedbackFrom} onChange={(e) => onFromChange(e.target.value)} placeholder={t('admin.from')} className="border border-slate-200 rounded px-2 py-1" title={t('admin.fromDate')} />
            <input type="date" value={feedbackTo} onChange={(e) => onToChange(e.target.value)} placeholder={t('admin.to')} className="border border-slate-200 rounded px-2 py-1" title={t('admin.toDate')} />
          </div>
        </div>
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={5} /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Meeting</th>
                    <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Comment</th>
                    <th className="px-6 py-3">Status</th>
                    {currentPermissions.moderateFeedback && <th className="px-6 py-3 text-end">{t('admin.actions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {feedback.map((f) => {
                    const isLong = (f.comment?.length || 0) > 100;
                    const isExpanded = expandedFeedbackId === f.id;
                    const displayComment = isLong && !isExpanded ? f.comment.slice(0, 100) + '…' : f.comment;
                    return (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{f.user_email}</td>
                        <td className="px-6 py-4">
                          {f.meeting_id ? (
                            <a href={`/meetings/${f.meeting_id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline">
                              {f.meeting_title || f.meeting_id}
                            </a>
                          ) : (
                            f.meeting_title || '—'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {f.rating} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className={!isExpanded && isLong ? 'truncate' : ''} title={f.comment}>{displayComment}</span>
                          {isLong && (
                            <button onClick={() => onExpandFeedback(isExpanded ? null : f.id)} className="ms-1 text-indigo-600 hover:text-indigo-700 text-xs font-medium">
                              {isExpanded ? t('admin.collapse') : t('admin.expand')}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {f.status === 'pending' && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-medium border border-amber-200">{t('admin.pending')}</span>}
                          {f.status === 'accepted' && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-200">{t('admin.accepted')}</span>}
                          {f.status === 'rejected' && <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200">{t('admin.rejected')}</span>}
                        </td>
                        {currentPermissions.moderateFeedback && f.status === 'pending' && (
                          <td className="px-6 py-4 text-end">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => onReviewFeedback(f.id, 'accepted')} className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded text-xs font-medium">{t('admin.accept')}</button>
                              <button onClick={() => onReviewFeedback(f.id, 'rejected')} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium">{t('admin.reject')}</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {feedback.length === 0 && (
                    <tr>
                      <td colSpan={currentPermissions.moderateFeedback ? 6 : 5} className="px-6 py-12 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-600 font-medium">No feedback in this filter</p>
                        <p className="text-sm text-slate-400 mt-1">Try selecting a different status</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
              <span>Page {feedbackPage} of {feedbackTotalPages}</span>
              <div className="flex gap-2">
                <button disabled={feedbackPage <= 1} onClick={() => onPageChange(Math.max(1, feedbackPage - 1))} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Previous</button>
                <button disabled={feedbackPage >= feedbackTotalPages} onClick={() => onPageChange(feedbackPage + 1)} className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {currentPermissions.moderateFeedback && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t('admin.moderationQueue')}</h2>
          </div>
          {moderationLoading ? (
            <div className="p-6">
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            </div>
          ) : moderationError ? (
            <div className="p-6 text-sm text-red-600">{moderationError}</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {moderationQueue.map((item) => (
                <div key={item.id} className="p-4 md:p-6 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-800">{item.user_email}</span>
                    <span className="text-slate-400">•</span>
                    {item.meeting_id ? (
                      <>
                        <a href={`/meetings/${item.meeting_id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{item.meeting_title || item.meeting_id}</a>
                        <span className="text-slate-400">•</span>
                      </>
                    ) : item.meeting_title ? (
                      <>
                        <span className="text-slate-600">{item.meeting_title}</span>
                        <span className="text-slate-400">•</span>
                      </>
                    ) : null}
                    <span className={`px-2 py-0.5 rounded border text-xs ${item.priority === 'high' ? 'text-red-700 bg-red-50 border-red-200' : item.priority === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-100 border-slate-200'}`}>
                      {item.priority || 'medium'} priority
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{item.comment}</p>
                  <textarea
                    value={moderationNotes[item.id] || ''}
                    onChange={(e) => onModerationNotesChange(item.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    placeholder={t('admin.moderationNotesPlaceholder')}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => onReviewFeedback(item.id, 'accepted')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                      <ShieldCheck className="w-4 h-4" /> {t('admin.accept')}
                    </button>
                    <button onClick={() => onReviewFeedback(item.id, 'rejected')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-red-50 text-red-700 hover:bg-red-100">
                      <XCircle className="w-4 h-4" /> {t('admin.reject')}
                    </button>
                  </div>
                </div>
              ))}
              {moderationQueue.length === 0 && (
                <div className="p-12 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                  <p className="text-slate-600 font-medium">All caught up!</p>
                  <p className="text-sm text-slate-400 mt-1">No pending feedback to review</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
