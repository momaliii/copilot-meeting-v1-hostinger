import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Calendar,
  Video,
  ExternalLink,
  Trash2,
  Loader2,
  Copy,
  Check,
  Users,
  Clock,
  Link2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type ScheduledMeeting = {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  meet_link: string | null;
  google_event_id: string | null;
  attendees: string[];
  bot_status: string;
  created_at: string;
};

type GoogleStatus = {
  connected: boolean;
  email: string | null;
};

type ScheduleMeetingViewProps = {
  token: string | null;
};

export default function ScheduleMeetingView({ token }: ScheduleMeetingViewProps) {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({ connected: false, email: null });
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [attendeesInput, setAttendeesInput] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const [availRes, statusRes] = await Promise.all([
        fetch('/api/google/auth/available'),
        fetch('/api/google/auth/status', { headers }),
      ]);
      const avail = await availRes.json();
      setGoogleAvailable(avail.available);
      if (statusRes.ok) {
        const status = await statusRes.json();
        setGoogleStatus(status);
      }
    } catch {
      // ignore
    }
  }, [token]);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google/calendar/meetings', { headers });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGoogleStatus();
    fetchMeetings();

    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      fetchGoogleStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('google_error')) {
      setError(`Google connection failed: ${params.get('google_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connectGoogle = async () => {
    try {
      const res = await fetch('/api/google/auth/url', { headers });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError('Failed to start Google connection');
    }
  };

  const disconnectGoogle = async () => {
    try {
      await fetch('/api/google/auth/disconnect', { method: 'DELETE', headers });
      setGoogleStatus({ connected: false, email: null });
    } catch {
      setError('Failed to disconnect Google account');
    }
  };

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !startTime) return;

    setCreating(true);
    setError(null);

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
      const attendees = attendeesInput
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch('/api/google/calendar/create-meeting', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          attendees,
          timeZone: tz,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create meeting');
      }

      setTitle('');
      setDescription('');
      setStartDate('');
      setStartTime('');
      setDuration(30);
      setAttendeesInput('');
      setShowForm(false);
      fetchMeetings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    try {
      await fetch(`/api/google/calendar/meetings/${id}`, { method: 'DELETE', headers });
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Failed to delete meeting');
    }
  };

  const copyLink = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMeetingStatus = (meeting: ScheduledMeeting) => {
    const now = new Date();
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'past';
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Not configured
  if (!googleAvailable) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Google Meet Integration</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Google Meet integration is not configured yet. The administrator needs to set up Google OAuth credentials
          (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) in the server environment.
        </p>
      </div>
    );
  }

  // Not connected
  if (!googleStatus.connected) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Connect Google Account</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          Connect your Google account to create Google Meet meetings and view your calendar.
        </p>
        <button
          onClick={connectGoogle}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect Google Account
        </button>
        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 inline-block">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Schedule Meetings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Connected as <span className="font-medium text-slate-700">{googleStatus.email}</span>
            <button onClick={disconnectGoogle} className="ml-2 text-red-500 hover:text-red-600 underline text-xs">
              Disconnect
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMeetings}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Create Meeting Form */}
      {showForm && (
        <form onSubmit={createMeeting} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Create Meeting with Google Meet</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly standup"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={todayStr}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attendees <span className="text-slate-400 font-normal">(comma-separated emails)</span>
            </label>
            <input
              type="text"
              value={attendeesInput}
              onChange={(e) => setAttendeesInput(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !title || !startDate || !startTime}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              Create Meeting
            </button>
          </div>
        </form>
      )}

      {/* Meetings List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading meetings...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-1">No scheduled meetings</h3>
          <p className="text-sm text-slate-500">Create your first meeting with Google Meet to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const status = getMeetingStatus(meeting);
            const isExpanded = expandedId === meeting.id;
            const attendees: string[] = Array.isArray(meeting.attendees) ? meeting.attendees : [];

            return (
              <div
                key={meeting.id}
                className={`bg-white rounded-2xl shadow-sm border ${
                  status === 'live' ? 'border-green-300 ring-1 ring-green-200' : 'border-slate-200'
                } overflow-hidden`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{meeting.title}</h3>
                        {status === 'live' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Live
                          </span>
                        )}
                        {status === 'past' && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                            Past
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(meeting.start_time)}
                        </span>
                        {attendees.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {attendees.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {meeting.meet_link && (
                      <>
                        <a
                          href={meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Join Meeting
                        </a>

                        <button
                          onClick={() => copyLink(meeting.id, meeting.meet_link!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                        >
                          {copiedId === meeting.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === meeting.id ? 'Copied' : 'Copy Link'}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => deleteMeeting(meeting.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 sm:px-5 py-3 bg-slate-50 text-sm space-y-2">
                    {meeting.description && (
                      <div>
                        <span className="font-medium text-slate-600">Description:</span>{' '}
                        <span className="text-slate-500">{meeting.description}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-600">Start:</span>{' '}
                      <span className="text-slate-500">{new Date(meeting.start_time).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-600">End:</span>{' '}
                      <span className="text-slate-500">{new Date(meeting.end_time).toLocaleString()}</span>
                    </div>
                    {meeting.meet_link && (
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 underline break-all"
                        >
                          {meeting.meet_link}
                        </a>
                      </div>
                    )}
                    {attendees.length > 0 && (
                      <div>
                        <span className="font-medium text-slate-600">Attendees:</span>{' '}
                        <span className="text-slate-500">{attendees.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
