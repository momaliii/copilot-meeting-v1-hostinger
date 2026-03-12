import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Clock, ChevronRight, Trash2, History, Plus, Search, X, CheckSquare, Activity, Edit2, Check, Cloud, CloudOff, RefreshCw, Upload } from 'lucide-react';
import { formatDate } from '../utils/format';
import type { Meeting } from '../types/meeting';

type SortOption = 'newest' | 'oldest' | 'title';
type DateFilterOption = 'all' | '7d' | '30d' | '90d' | 'month' | 'year';

function isMeetingInDateRange(meetingDate: string, filter: DateFilterOption): boolean {
  if (filter === 'all') return true;
  const d = new Date(meetingDate);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const meetingStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (filter === '7d') {
    const cutoff = new Date(todayStart);
    cutoff.setDate(cutoff.getDate() - 7);
    return meetingStart >= cutoff;
  }
  if (filter === '30d') {
    const cutoff = new Date(todayStart);
    cutoff.setDate(cutoff.getDate() - 30);
    return meetingStart >= cutoff;
  }
  if (filter === '90d') {
    const cutoff = new Date(todayStart);
    cutoff.setDate(cutoff.getDate() - 90);
    return meetingStart >= cutoff;
  }
  if (filter === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (filter === 'year') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

type MeetingHistoryViewProps = {
  meetings: Meeting[];
  meetingsLoading: boolean;
  onLoadMeeting: (meeting: Meeting) => void | Promise<void>;
  onConfirmDelete: (id: string) => Promise<void>;
  onUpdateTitle: (id: string, newTitle: string) => Promise<void>;
  onRecordNew: () => void;
  onSyncMeeting?: (id: string) => Promise<boolean>;
  cloudSaveAvailable?: boolean;
};

export default function MeetingHistoryView({
  meetings,
  meetingsLoading,
  onLoadMeeting,
  onConfirmDelete,
  onUpdateTitle,
  onRecordNew,
  onSyncMeeting,
  cloudSaveAvailable,
}: MeetingHistoryViewProps) {
  const { t } = useTranslation();
  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState<SortOption>('newest');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncAllInProgress, setSyncAllInProgress] = useState(false);

  const historyFiltered = useMemo(() => {
    let result = meetings;
    if (historySearch.trim()) {
      result = result.filter((m) => m.title.toLowerCase().includes(historySearch.toLowerCase()));
    }
    if (dateFilter !== 'all') {
      result = result.filter((m) => isMeetingInDateRange(m.date, dateFilter));
    }
    return result;
  }, [meetings, historySearch, dateFilter]);

  const historySorted = useMemo(
    () =>
      [...historyFiltered].sort((a, b) => {
        if (historySort === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (historySort === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }),
    [historyFiltered, historySort]
  );

  const handleConfirmDelete = async () => {
    if (!deleteMeetingId) return;
    await onConfirmDelete(deleteMeetingId);
    setShowDeleteConfirm(false);
    setDeleteMeetingId(null);
  };

  const startEditTitle = (e: React.MouseEvent, meeting: Meeting) => {
    e.stopPropagation();
    setEditingMeetingId(meeting.id);
    setEditTitleValue(meeting.title);
  };

  const saveEditTitle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editingMeetingId || !editTitleValue.trim()) {
      setEditingMeetingId(null);
      return;
    }
    await onUpdateTitle(editingMeetingId, editTitleValue.trim());
    setEditingMeetingId(null);
    setEditTitleValue('');
  };

  const cancelEditTitle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingMeetingId(null);
    setEditTitleValue('');
  };

  const unsyncedMeetings = useMemo(() => meetings.filter(m => !m.synced), [meetings]);

  const handleSyncOne = async (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    if (!onSyncMeeting || syncingIds.has(meetingId)) return;
    setSyncingIds(prev => new Set(prev).add(meetingId));
    try {
      await onSyncMeeting(meetingId);
    } finally {
      setSyncingIds(prev => { const next = new Set(prev); next.delete(meetingId); return next; });
    }
  };

  const handleSyncAll = async () => {
    if (!onSyncMeeting || syncAllInProgress || unsyncedMeetings.length === 0) return;
    setSyncAllInProgress(true);
    const ids = unsyncedMeetings.map(m => m.id);
    setSyncingIds(new Set(ids));
    for (const id of ids) {
      await onSyncMeeting(id);
      setSyncingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
    setSyncAllInProgress(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-slate-900">{t('nav.meetingHistory')}</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={t('dashboard.searchMeetings')}
                className="flex-1 min-w-0 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {historySearch.trim() && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={t('history.clearSearch')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              title={t('history.filterDate')}
            >
              <option value="all">{t('history.filterAllTime')}</option>
              <option value="7d">{t('history.filterLast7Days')}</option>
              <option value="30d">{t('history.filterLast30Days')}</option>
              <option value="90d">{t('history.filterLast90Days')}</option>
              <option value="month">{t('history.filterThisMonth')}</option>
              <option value="year">{t('history.filterThisYear')}</option>
            </select>
            <select
              value={historySort}
              onChange={(e) => setHistorySort(e.target.value as SortOption)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="newest">{t('history.sortNewest')}</option>
              <option value="oldest">{t('history.sortOldest')}</option>
              <option value="title">{t('history.sortTitle')}</option>
            </select>
            {cloudSaveAvailable && unsyncedMeetings.length > 0 && (
              <button
                onClick={handleSyncAll}
                disabled={syncAllInProgress}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Upload className={`w-4 h-4 ${syncAllInProgress ? 'animate-pulse' : ''}`} />
                {syncAllInProgress
                  ? t('history.syncing')
                  : t('history.syncAll', { count: unsyncedMeetings.length })}
              </button>
            )}
            <button
              onClick={onRecordNew}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.recordNew')}
            </button>
          </div>
        </div>

        {meetingsLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-slate-600">{t('dashboard.noMeetingsRecorded')}</p>
            <p className="text-sm mt-1">{t('dashboard.recordFirstMeeting')}</p>
            <button
              onClick={onRecordNew}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.startFirstRecording')}
            </button>
          </div>
        ) : historySorted.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-slate-600">
              {historySearch.trim()
                ? t('dashboard.noMatch', { query: historySearch })
                : t('history.noMatchDate')}
            </p>
            <button
              onClick={() => {
                setHistorySearch('');
                setDateFilter('all');
              }}
              className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {t('history.clearSearch')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {historySorted.map((meeting) => {
              const actionCount = meeting.analysis?.actionItems?.length ?? 0;
              return (
                <div
                  key={meeting.id}
                  onClick={() => !editingMeetingId && onLoadMeeting(meeting)}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer bg-slate-50 hover:bg-white group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingMeetingId === meeting.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditTitle();
                              if (e.key === 'Escape') cancelEditTitle();
                            }}
                            autoFocus
                            className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={(e) => saveEditTitle(e)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                            title={t('history.save')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => cancelEditTitle(e)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"
                            title={t('history.cancel')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {meeting.title}
                        </h4>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(meeting.date)}
                        </span>
                        <span className={`flex items-center gap-1 ${meeting.synced ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {meeting.synced ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                          {meeting.synced ? t('dashboard.synced') : t('dashboard.localOnly')}
                        </span>
                        {meeting.analysis.sentiment && (
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            {meeting.analysis.sentiment}
                          </span>
                        )}
                        {actionCount > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" />
                            {t('history.actionItems', { count: actionCount })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    {cloudSaveAvailable && !meeting.synced && editingMeetingId !== meeting.id && (
                      <button
                        onClick={(e) => handleSyncOne(e, meeting.id)}
                        disabled={syncingIds.has(meeting.id)}
                        className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                        title={t('history.syncToCloud')}
                        aria-label={t('history.syncToCloud')}
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingIds.has(meeting.id) ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    {editingMeetingId !== meeting.id && (
                      <button
                        onClick={(e) => startEditTitle(e, meeting)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title={t('history.editTitle')}
                        aria-label={t('history.editTitle')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteMeetingId(meeting.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title={t('history.delete')}
                      aria-label={t('history.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDeleteConfirm && deleteMeetingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            setShowDeleteConfirm(false);
            setDeleteMeetingId(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-700">{t('history.deleteConfirm')}</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteMeetingId(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                {t('history.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                {t('history.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
