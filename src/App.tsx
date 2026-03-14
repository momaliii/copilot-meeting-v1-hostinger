import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { Mic, Square, Loader2, FileText, CheckSquare, MessageSquare, Mail, AlertCircle, MonitorUp, Play, Pause, Clock, ChevronRight, ChevronDown, History, Plus, Trash2, Users, Edit2, Check, Share2, Lightbulb, AlertTriangle, HelpCircle, Activity, Zap, Settings, X, Lock, Star, RefreshCw, Search, LayoutDashboard, MessageCircle, Send, Image, LogOut, Smile, Languages, ArrowLeft, Upload, Menu } from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from './utils/format';
import LanguageSwitcher from './components/LanguageSwitcher';
import EmojiPicker from 'emoji-picker-react';
import Joyride, { CallBackProps, EVENTS, STATUS, Step } from 'react-joyride';
import { saveMeetingToDB, getMeetingsFromDB, deleteMeetingFromDB, clearAllMeetingsFromDB } from './db';
import { startSessionRecorder } from './sessionRecorder';
import HomePage from './pages/HomePage';
import LandingPageRoute from './pages/LandingPageRoute';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CheckoutPage from './pages/CheckoutPage';
import { useAuth } from './AuthContext';
import AuthModal from './components/AuthModal';
import ProfileView from './components/ProfileView';
import AdminDashboard from './AdminDashboard';
import AnnouncementBar from './components/AnnouncementBar';
import MeetingDetailsView from './components/MeetingDetailsView';
import MeetingHistoryView from './components/MeetingHistoryView';
import SupportView from './components/SupportView';
import PlanDowngradePopup from './components/PlanDowngradePopup';
import DashboardView from './components/DashboardView';
import ScheduleMeetingView from './components/ScheduleMeetingView';
import AudioPlayer from './components/AudioPlayer';
import MediaPlayer from './components/MediaPlayer';
import UserSidebar, { type UserSidebarView } from './components/UserSidebar';
import TourTooltip from './components/TourTooltip';
import { useMediaQuery } from './hooks/useMediaQuery';
import type { AnalysisResult, Meeting } from './types/meeting';

const LANGUAGE_OPTIONS = [
  { value: 'Original Language', label: 'Original Language (Auto-detect)' },
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Saudi Arabic', label: 'Saudi Arabic' },
  { value: 'Hindi', label: 'Hindi' },
];

const LANGUAGE_TO_BCP47: Record<string, string> = {
  'Original Language': '', // Browser auto-detect
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-BR',
  'Dutch': 'nl-NL',
  'Russian': 'ru-RU',
  'Japanese': 'ja-JP',
  'Chinese (Simplified)': 'zh-CN',
  'Korean': 'ko-KR',
  'Arabic': 'ar-SA',
  'Saudi Arabic': 'ar-SA',
  'Hindi': 'hi-IN',
};

type UserAnalytics = {
  rangeDays: number;
  summary: {
    totalMeetings: number;
    totalSeconds: number;
    avgDurationSeconds: number;
  };
  dailyUsage: { day: string; meetings: number; seconds: number }[];
};

export default function App() {
  const { t } = useTranslation();
  const { user, token, logout, loading, adminViewMode, setAdminViewMode } = useAuth();
  const [view, setView] = useState<'home' | 'app'>(() => {
    if (typeof window === 'undefined') return 'home';
    const p = window.location.pathname;
    // / = landing (home), /dashboard = app, /meetings/* = app
    return p.startsWith('/meetings/') || p === '/dashboard' ? 'app' : 'home';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSource, setRecordingSource] = useState<'mic' | 'tab' | 'both'>('both');
  const [recordVideo, setRecordVideo] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [pendingVideoBlob, setPendingVideoBlob] = useState<Blob | null>(null);
  const [outputLanguage, setOutputLanguage] = useState('Original Language');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [lastFailedLanguage, setLastFailedLanguage] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analysisStartedAtMs, setAnalysisStartedAtMs] = useState<number | null>(null);
  const [analysisElapsedSec, setAnalysisElapsedSec] = useState(0);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'transcript' | 'actionItems' | 'email'>('summary');
  const [scrollToLine, setScrollToLine] = useState<number | undefined>(undefined);
  const [transcriptSegments, setTranscriptSegments] = useState<{ text: string; isFinal: boolean }[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [liveTranscriptError, setLiveTranscriptError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showScheduleView, setShowScheduleView] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [translateDropdownOpen, setTranslateDropdownOpen] = useState(false);
  const [reanalyzeDropdownOpen, setReanalyzeDropdownOpen] = useState(false);
  const [supportMessages, setSupportMessages] = useState<{ id: string; sender_type: string; sender_id: string; content: string; attachments?: string[]; created_at: string }[]>([]);
  const [supportConversationId, setSupportConversationId] = useState<string | null>(null);
  const [supportConversationLoading, setSupportConversationLoading] = useState(false);
  const [supportConversationError, setSupportConversationError] = useState<string | null>(null);
  const [supportConversationRetryKey, setSupportConversationRetryKey] = useState(0);
  const [supportInput, setSupportInput] = useState('');
  const [supportPendingAttachments, setSupportPendingAttachments] = useState<{ url: string; filename?: string }[]>([]);
  const [supportSending, setSupportSending] = useState(false);
  const [showSupportEmojiPicker, setShowSupportEmojiPicker] = useState(false);
  const [supportTyping, setSupportTyping] = useState(false);
  const [supportOnline, setSupportOnline] = useState(false);
  const [storeAudio, setStoreAudio] = useState(() => {
    const saved = localStorage.getItem('storeAudio');
    return saved !== 'false';
  });
  const [cloudSaveEnabled, setCloudSaveEnabled] = useState(false);
  const [sessionReplayConsent, setSessionReplayConsent] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isRecordingError, setIsRecordingError] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);

  const [runTour, setRunTour] = useState(false);
  const [usage, setUsage] = useState<{ usedSeconds: number, limitSeconds: number, remainingSeconds: number, limitMinutes: number, languageChangesLimit?: number, isUnlimited?: boolean, softLimitMinutes?: number, softLimitSeconds?: number, hardLimitMinutes?: number, hardLimitSeconds?: number, planExpiresAt?: string | null, planId?: string } | null>(null);
  const [showDowngradePopup, setShowDowngradePopup] = useState(false);
  const [downgradedFromPlan, setDowngradedFromPlan] = useState('');
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [userAnalyticsLoading, setUserAnalyticsLoading] = useState(false);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [analyticsDays, setAnalyticsDays] = useState(14);
  const [meetingsSearch, setMeetingsSearch] = useState('');
  
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const usageRef = useRef<{ usedSeconds: number, limitSeconds: number, remainingSeconds: number, limitMinutes: number, languageChangesLimit?: number, isUnlimited?: boolean, softLimitMinutes?: number, softLimitSeconds?: number, hardLimitMinutes?: number, hardLimitSeconds?: number, planExpiresAt?: string | null, planId?: string } | null>(null);
  useEffect(() => {
    usageRef.current = usage;
  }, [usage]);

  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({ top: transcriptScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcriptSegments, interimTranscript]);

  const hasVideoAccess = user?.plan_features?.video_caption || user?.role === 'admin';
  useEffect(() => {
    if (!hasVideoAccess && recordVideo) setRecordVideo(false);
  }, [hasVideoAccess, recordVideo]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !token) {
      setGoogleConnected(false);
      return;
    }
    const fetchGoogleStatus = async () => {
      try {
        const res = await fetch('/api/google/auth/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleConnected(!!data.connected);
        }
      } catch {
        setGoogleConnected(false);
      }
    };
    fetchGoogleStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      fetchGoogleStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, token]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentMeetingId && !analysis && !showDashboard && !showProfile && !showHistoryView && !showSupportChat) {
        if (e.code === 'Space' && isRecording && !e.repeat) {
          e.preventDefault();
          if (isPaused) resumeRecording();
          else pauseRecording();
        } else if (e.code === 'Escape' && isRecording) {
          e.preventDefault();
          requestStopRecording();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isPaused, currentMeetingId, analysis, showDashboard, showProfile, showHistoryView, showSupportChat]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const recognitionRef = useRef<any>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const supportSocketRef = useRef<any>(null);
  const supportTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supportConvIdRef = useRef<string | null>(null);
  const uploadAudioInputRef = useRef<HTMLInputElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const transcribeWsRef = useRef<WebSocket | null>(null);
  const transcribeAudioContextRef = useRef<AudioContext | null>(null);
  const transcribeProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const saveWithoutAnalyzing = async (blobOverride?: Blob) => {
    const blob = blobOverride ?? pendingVideoBlob ?? pendingAudioBlob;
    if (!blob) return;
    const placeholderAnalysis: AnalysisResult = {
      transcript: '',
      summary: t('recording.audioReadyForAnalysis'),
      actionItems: [],
      keyDecisions: [],
      sentiment: '',
      followUpEmail: '',
    };
    const isVideo = blob.type.startsWith('video/');
    const newMeeting: Meeting = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: `Recording ${new Date().toLocaleDateString()}`,
      analysis: placeholderAnalysis,
      audioBlob: !isVideo ? blob : undefined,
      videoBlob: isVideo ? blob : undefined,
      analysisLanguage: outputLanguage,
      originalAnalysis: placeholderAnalysis,
    };
    try {
      await saveMeetingToDB(newMeeting);
      setMeetings(prev => [newMeeting, ...prev]);
      setCurrentMeetingId(newMeeting.id);
      setAnalysis(newMeeting.analysis);
      setPendingAudioBlob(null);
      setPendingVideoBlob(null);
      setAudioUrl(null);
      setVideoUrl(null);
      setActiveTab('summary');
      if (window.location.pathname !== `/meetings/${newMeeting.id}`) {
        window.history.pushState({ meetingId: newMeeting.id }, '', `/meetings/${newMeeting.id}`);
      }
    } catch (err) {
      console.error('Failed to save recording', err);
      setError('Failed to save. Your browser may be out of storage space.');
    }
  };

  const testMicrophone = async () => {
    try {
      setIsTestingMic(true);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play().catch(() => {});
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 2000);
    } catch (err: any) {
      setError(err?.message || 'Microphone access failed.');
    } finally {
      setIsTestingMic(false);
    }
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a|mp4)$/i)) {
      setError('Please select an audio file (MP3, WAV, M4A, WebM, or OGG).');
      return;
    }
    setError(null);
    setPendingAudioBlob(file);
    setRecordingTime(0);
    e.target.value = '';
  };

  // Email verification: ?verifyEmail=token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verifyEmail');
    if (!verifyToken) return;

    (async () => {
      try {
        const res = await fetch(`/api/auth/confirm-email?token=${encodeURIComponent(verifyToken)}`);
        const data = await res.json();
        const url = new URL(window.location.href);
        url.searchParams.delete('verifyEmail');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
        if (res.ok && data.success) {
          logout();
          setShowAuthModal(true);
          setError(t('profile.emailChanged'));
        } else {
          setError(data.error || 'Verification failed');
        }
      } catch (err) {
        setError('Verification failed');
      }
    })();
  }, []);

  // Deep linking: ?start=record or ?view=dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startRecord = params.get('start') === 'record';
    const viewDashboard = params.get('view') === 'dashboard';
    if (!startRecord && !viewDashboard) return;

    const applyIntent = () => {
      setView('app');
      setShowDashboard(viewDashboard);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(false);
      // Clean URL without full reload
      const url = new URL(window.location.href);
      url.searchParams.delete('start');
      url.searchParams.delete('view');
      url.searchParams.delete('tabUrl');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    };

    if (user) {
      applyIntent();
    } else {
      setShowAuthModal(true);
    }
  }, [user]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStartedAtMs(null);
      setAnalysisElapsedSec(0);
      return;
    }

    const started = Date.now();
    setAnalysisStartedAtMs(started);
    setAnalysisElapsedSec(0);

    const id = setInterval(() => {
      setAnalysisElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => clearInterval(id);
  }, [isAnalyzing]);

  useEffect(() => {
    loadMeetingsFromDB();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllStreams();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [user, cloudSaveEnabled]);

  // Admin redirect rules: check before any other navigation
  useEffect(() => {
    const path = window.location.pathname;
    fetch(`/api/public/redirect?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((data) => {
        const to = data?.to;
        if (!to || to === path) return;
        if (to.startsWith('http://') || to.startsWith('https://')) {
          window.location.replace(to);
          return;
        }
        window.history.replaceState({}, '', to);
        window.dispatchEvent(new PopStateEvent('popstate'));
      })
      .catch(() => {});
  }, []);

  // Auth-based redirects: /dashboard requires user; /, /landing, /login, /signup redirect to dashboard when user
  useEffect(() => {
    if (loading) return;
    const path = window.location.pathname;
    if (path === '/dashboard' && !user) {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
      setView('home');
      return;
    }
    if (user && (path === '/' || path === '/landing' || path === '/login' || path === '/signup')) {
      window.history.replaceState({}, '', '/dashboard');
      setCurrentPath('/dashboard');
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(true);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(false);
      return;
    }
  }, [loading, user]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/meetings/')) {
      setView('app');
    }
    if (path === '/dashboard' && user) {
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(true);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(false);
      return;
    }
    const publicPaths = ['/', '/landing', '/pricing', '/about', '/contact', '/privacy', '/terms', '/login', '/signup', '/checkout'];
    if (publicPaths.includes(path)) {
      if (user && (path === '/login' || path === '/signup')) {
        window.history.replaceState({}, '', '/dashboard');
        setCurrentPath('/dashboard');
        setView('app');
        setCurrentMeetingId(null);
        setShowDashboard(true);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(false);
        return;
      }
      setView('home');
      return;
    }
    if (path === '/record') {
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(false);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(false);
      return;
    }
    if (path === '/history') {
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(false);
      setShowProfile(false);
      setShowHistoryView(true);
      setShowSupportChat(false);
      setShowScheduleView(false);
      return;
    }
    if (path === '/schedule') {
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(false);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(false);
      setShowScheduleView(true);
      return;
    }
    if (path === '/support') {
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(false);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(true);
      setShowScheduleView(false);
      return;
    }
    if (path === '/profile') {
      if (!loading && !user) {
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
        setView('home');
        return;
      }
      if (!user) return;
      setView('app');
      setCurrentMeetingId(null);
      setShowDashboard(false);
      setShowProfile(true);
      setShowHistoryView(false);
      setShowSupportChat(false);
      return;
    }
    const match = path.match(/^\/meetings\/([^/]+)$/);
    if (match && !meetingsLoading) {
      const id = match[1];
      const meeting = meetings.find(m => m.id === id);
      const hash = window.location.hash;
      const lineMatch = hash.match(/^#transcript-line-(\d+)$/);
      if (lineMatch) {
        setActiveTab('transcript');
        setScrollToLine(parseInt(lineMatch[1], 10));
      } else {
        setScrollToLine(undefined);
      }
      if (meeting) {
        setCurrentMeetingId(meeting.id);
        setShowDashboard(false);
        setShowHistoryView(false);
        setAnalysis(normalizeAnalysis(meeting.analysis));
        const blob = meeting.videoBlob || meeting.audioBlob;
        setAudioUrl(blob ? URL.createObjectURL(blob) : null);
        setVideoUrl(meeting.videoBlob ? URL.createObjectURL(meeting.videoBlob) : null);
      } else if (user) {
        fetch(`/api/meetings/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.analysis) {
              const normalized = normalizeAnalysis(data.analysis);
              const m: Meeting = {
                id: data.id,
                date: data.date,
                title: data.title,
                analysis: normalized,
              };
              setMeetings(prev => (prev.some(x => x.id === m.id) ? prev : [m, ...prev]));
              setCurrentMeetingId(m.id);
              setShowDashboard(false);
              setShowHistoryView(false);
              setAnalysis(normalized);
              setAudioUrl(null);
              setVideoUrl(null);
              const hash = window.location.hash;
              const lineMatch = hash.match(/^#transcript-line-(\d+)$/);
              if (lineMatch) {
                setActiveTab('transcript');
                setScrollToLine(parseInt(lineMatch[1], 10));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [meetings, meetingsLoading, loading, user]);

  useEffect(() => {
    const handleHashChange = () => {
      const path = window.location.pathname;
      if (!path.startsWith('/meetings/') || !currentMeetingId) return;
      const hash = window.location.hash;
      const lineMatch = hash.match(/^#transcript-line-(\d+)$/);
      if (lineMatch) {
        setActiveTab('transcript');
        setScrollToLine(parseInt(lineMatch[1], 10));
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentMeetingId]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      const match = path.match(/^\/meetings\/([^/]+)$/);
      // Auth-based redirects on back/forward
      if (path === '/dashboard' && !user) {
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
        setView('home');
        return;
      }
      if (user && (path === '/' || path === '/login' || path === '/signup')) {
        window.history.replaceState({}, '', '/dashboard');
        setCurrentPath('/dashboard');
        setView('app');
        setCurrentMeetingId(null);
        setShowDashboard(true);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(false);
        return;
      }
      if (path === '/dashboard' || path === '/') {
        if (path === '/dashboard' && user) setView('app');
        setCurrentMeetingId(null);
        setShowDashboard(true);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(false);
        return;
      }
      if (path === '/record') {
        setCurrentMeetingId(null);
        setShowDashboard(false);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(false);
        setShowScheduleView(false);
        return;
      }
      if (path === '/history') {
        setCurrentMeetingId(null);
        setShowDashboard(false);
        setShowProfile(false);
        setShowHistoryView(true);
        setShowSupportChat(false);
        setShowScheduleView(false);
        return;
      }
      if (path === '/schedule') {
        setCurrentMeetingId(null);
        setShowDashboard(false);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(false);
        setShowScheduleView(true);
        return;
      }
      if (path === '/support') {
        setCurrentMeetingId(null);
        setShowDashboard(false);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(true);
        setShowScheduleView(false);
        return;
      }
      if (path === '/profile') {
        if (!user) {
          window.history.replaceState({}, '', '/');
          setCurrentPath('/');
          setView('home');
          return;
        }
        setCurrentMeetingId(null);
        setShowDashboard(false);
        setShowProfile(true);
        setShowHistoryView(false);
        setShowSupportChat(false);
        return;
      }
      if (!match) {
        setCurrentMeetingId(null);
        setShowDashboard(true);
        setShowHistoryView(false);
        setShowSupportChat(false);
        setAnalysis(null);
        setAudioUrl(null);
        setVideoUrl(null);
      } else {
        const meeting = meetings.find(m => m.id === match[1]);
        if (meeting) {
          setCurrentMeetingId(meeting.id);
          setShowDashboard(false);
          setShowHistoryView(false);
          setAnalysis(meeting.analysis);
          const blob = meeting.videoBlob || meeting.audioBlob;
          setAudioUrl(blob ? URL.createObjectURL(blob) : null);
          setVideoUrl(meeting.videoBlob ? URL.createObjectURL(meeting.videoBlob) : null);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [meetings, user]);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCloudSaveEnabled(!!data.cloudSaveEnabled);
        setSessionReplayConsent(!!data.sessionReplayConsent);
      }
    } catch (err) {
      console.error('Failed to fetch preferences', err);
    }
  };

  useEffect(() => {
    if (user && view === 'app') {
      const hasSeenTour = localStorage.getItem('hasSeenTour');
      if (!hasSeenTour) {
        // Ensure record view is shown so tour targets (recording source, etc.) are visible
        setShowDashboard(false);
        setShowProfile(false);
        setShowHistoryView(false);
        setShowSupportChat(false);
        setCurrentMeetingId(null);
        setRunTour(true);
      }
      fetchUsage();
      fetchUserAnalytics(analyticsDays);
      fetchPreferences();
    }
  }, [user, view, analyticsDays]);

  useEffect(() => {
    if (user && sessionReplayConsent && view === 'app') {
      const stop = startSessionRecorder();
      return stop;
    }
  }, [user, sessionReplayConsent, view]);

  useEffect(() => {
    if (user?.role === 'admin' && adminViewMode === 'user' && view === 'home') {
      setView('app');
    }
  }, [user?.role, adminViewMode, view]);

  const fetchSupportConversation = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/user/support/conversation', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const { id, messages } = await res.json();
        setSupportConversationId(id);
        setSupportMessages(messages || []);
        return id;
      }
    } catch (err) {
      console.error('Failed to fetch support conversation', err);
    }
    return null;
  };

  useEffect(() => {
    if (!showSupportChat || !user || view !== 'app') return;
    setSupportTyping(false);
    setSupportOnline(false);
    setSupportConversationError(null);
    setSupportConversationLoading(true);
    let socket: any = null;
    fetchSupportConversation().then((convId) => {
      setSupportConversationLoading(false);
      if (!convId) {
        setSupportConversationError(t('support.loadError'));
        return;
      }
      supportConvIdRef.current = convId;
      const token = localStorage.getItem('token');
      if (!token) return;
      socket = io(window.location.origin, { auth: { token } });
      supportSocketRef.current = socket;
      socket.on('connect', () => {
        socket.emit('join_conversation', { conversationId: convId, type: 'user' });
      });
      socket.on('new_message', (msg: { id: string; sender_type: string; sender_id: string; content: string; attachments?: string[]; created_at: string }) => {
        if (msg.sender_type === 'user' && msg.sender_id === user?.id) return;
        setSupportMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      });
      socket.on('typing_start', (data: { type?: string }) => {
        if (data?.type === 'admin') setSupportTyping(true);
      });
      socket.on('typing_stop', (data: { type?: string }) => {
        if (data?.type === 'admin') setSupportTyping(false);
      });
      socket.on('presence', (data: { type?: string; online?: boolean }) => {
        if (data?.type === 'admin') setSupportOnline(!!data.online);
      });
    });
    return () => {
      setSupportConversationLoading(false);
      if (socket) socket.disconnect();
      supportSocketRef.current = null;
      supportConvIdRef.current = null;
      if (supportTypingTimeoutRef.current) clearTimeout(supportTypingTimeoutRef.current);
    };
  }, [showSupportChat, user, view, supportConversationRetryKey]);

  const emitSupportTyping = (isTyping: boolean) => {
    const convId = supportConvIdRef.current;
    const sock = supportSocketRef.current;
    if (!convId || !sock?.connected) return;
    sock.emit(isTyping ? 'typing_start' : 'typing_stop', { conversationId: convId });
  };

  const handleSupportInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSupportInput(e.target.value);
    emitSupportTyping(true);
    if (supportTypingTimeoutRef.current) clearTimeout(supportTypingTimeoutRef.current);
    supportTypingTimeoutRef.current = setTimeout(() => {
      emitSupportTyping(false);
      supportTypingTimeoutRef.current = null;
    }, 300);
  };

  const uploadSupportFile = async (file: File): Promise<{ url: string; filename?: string } | null> => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/user/support/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const { url, filename } = await res.json();
        return { url, filename: filename || file.name };
      }
    } catch (err) {
      console.error('Failed to upload file', err);
    }
    return null;
  };

  const sendSupportMessage = async () => {
    const content = supportInput.trim();
    const hasContent = content.length > 0;
    const hasAttachments = supportPendingAttachments.length > 0;
    if ((!hasContent && !hasAttachments) || supportSending) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setSupportSending(true);
    try {
      const res = await fetch('/api/user/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: content || ' ',
          attachments: supportPendingAttachments.length > 0 ? supportPendingAttachments.map((a) => a.url) : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSupportMessages((prev) => [...prev, data.message]);
        setSupportInput('');
        setSupportPendingAttachments([]);
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSupportSending(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        if (view === 'app' && showDashboard && !currentMeetingId && !showProfile && !showHistoryView && !showSupportChat && !isRecording && !isAnalyzing && !pendingAudioBlob && !pendingVideoBlob) {
          startNewMeeting();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, showDashboard, currentMeetingId, showProfile, showHistoryView, showSupportChat, isRecording, isAnalyzing, pendingAudioBlob, pendingVideoBlob]);

  useEffect(() => {
    if (isDesktop) setIsMobileMenuOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    if (userMenuOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen, isMobileMenuOpen]);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setUsageLoading(true);
      const res = await fetch('/api/user/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);

        if (data.planId) {
          const lastKnown = localStorage.getItem('last_known_plan_id');
          if (lastKnown && lastKnown !== 'starter' && data.planId === 'starter' && !localStorage.getItem('dismiss_downgrade_popup')) {
            setDowngradedFromPlan(lastKnown);
            setShowDowngradePopup(true);
          }
          localStorage.setItem('last_known_plan_id', data.planId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch usage', err);
    } finally {
      setUsageLoading(false);
    }
  };

  const syncMeetingUsage = async (id: string, title: string, durationSeconds: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch('/api/user/usage', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, title, durationSeconds })
      });
      fetchUsage();
      fetchUserAnalytics();
    } catch (err) {
      console.error('Failed to sync usage', err);
    }
  };

  const fetchUserAnalytics = async (days?: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setUserAnalyticsLoading(true);
      const d = days ?? analyticsDays;
      const res = await fetch(`/api/user/analytics?days=${d}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setUserAnalyticsLoading(false);
    }
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    const totalSteps = 12;

    // Ensure record view is shown for recording steps (0-5)
    if (type === EVENTS.STEP_BEFORE && index <= 5) {
      startNewMeeting();
    }

    // Open mobile sidebar for sidebar steps (Dashboard, Record Meeting, Meeting History, Support, Monthly usage)
    if (type === EVENTS.STEP_BEFORE && index >= 6 && index <= 10) {
      setIsMobileMenuOpen(true);
    }

    // Ensure test microphone button is visible (only shows when mic or both selected)
    if (type === EVENTS.STEP_BEFORE && index === 5) {
      setRecordingSource('mic');
    }

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour', 'true');
      // Track tour completion/skip for A/B analysis
      if (user?.id) {
        const eventType = status === STATUS.FINISHED ? 'completed' : 'skipped';
        fetch('/api/user/tour-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ eventType, stepIndex: index, totalSteps }),
        }).catch(() => {});
      }
    }
  };

  const tourSteps: Step[] = [
    { target: '.tour-recording-source', content: t('joyride.step1'), title: t('joyride.step1Title'), disableBeacon: true, placement: 'bottom', floaterProps: { offset: 12 } },
    { target: '.tour-mic-only', content: t('joyride.step2'), title: t('joyride.step2Title'), placement: 'bottom', floaterProps: { offset: 12 } },
    { target: '.tour-tab-only', content: t('joyride.step3'), title: t('joyride.step3Title'), placement: 'bottom', floaterProps: { offset: 12 } },
    { target: '.tour-record-button', content: t('joyride.step4'), title: t('joyride.step4Title'), placement: 'bottom', floaterProps: { offset: 12 } },
    { target: '.tour-upload-audio', content: t('joyride.step5'), title: t('joyride.step5Title'), placement: 'bottom', floaterProps: { offset: 12 } },
    { target: '.tour-test-microphone', content: t('joyride.step6'), title: t('joyride.step6Title'), placement: 'bottom', floaterProps: { offset: 12 } },
    { target: '.tour-dashboard', content: t('joyride.step7'), title: t('joyride.step7Title'), placement: 'right', floaterProps: { offset: 12 } },
    { target: '.tour-new-meeting', content: t('joyride.step8'), title: t('joyride.step8Title'), placement: 'right', floaterProps: { offset: 12 } },
    { target: '.tour-history', content: t('joyride.step9'), title: t('joyride.step9Title'), placement: 'right', floaterProps: { offset: 12 } },
    { target: '.tour-support', content: t('joyride.step10'), title: t('joyride.step10Title'), placement: 'right', floaterProps: { offset: 12 } },
    { target: '.tour-monthly-usage', content: t('joyride.step11'), title: t('joyride.step11Title'), placement: 'right', floaterProps: { offset: 12 } },
    { target: '.tour-user-menu', content: t('joyride.step12'), title: t('joyride.step12Title'), placement: 'bottom-end', floaterProps: { offset: 12 } },
  ];

  const loadMeetingsFromDB = async () => {
    try {
      setMeetingsLoading(true);
      const dbMeetings = await getMeetingsFromDB();
      const hasCloudSave = user && (user.plan_features?.cloud_save || user.role === 'admin') && cloudSaveEnabled;
      if (hasCloudSave) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const res = await fetch('/api/meetings/list', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const cloudMeetings = await res.json();
              const byId = new Map<string, Meeting>();
              dbMeetings.forEach((m: Meeting) => byId.set(m.id, m));
              const cloudIds = new Set<string>();
              cloudMeetings.forEach((c: { id: string; title: string; date: string; duration: number; transcript?: string; analysis?: AnalysisResult; media_path?: string | null }) => {
                cloudIds.add(c.id);
                const existing = byId.get(c.id);
                const rawAnalysis = c.analysis ? { ...c.analysis, transcript: c.analysis.transcript ?? c.transcript ?? '' } : { transcript: c.transcript ?? '', summary: '', actionItems: [], keyDecisions: [], sentiment: '', followUpEmail: '' };
                const hasLocalBlob = !!(existing?.audioBlob || existing?.videoBlob);
                const meeting: Meeting = {
                  id: c.id,
                  title: c.title,
                  date: c.date,
                  analysis: normalizeAnalysis(rawAnalysis),
                  audioBlob: existing?.audioBlob,
                  videoBlob: existing?.videoBlob,
                  analysisLanguage: existing?.analysisLanguage,
                  originalAnalysis: existing?.originalAnalysis ?? rawAnalysis,
                  translationCache: existing?.translationCache,
                  synced: true,
                  mediaUrl: c.media_path && !hasLocalBlob ? `/api/meetings/${c.id}/media` : undefined,
                };
                byId.set(c.id, meeting);
                saveMeetingToDB(meeting).catch(() => {});
              });
              byId.forEach((m, id) => {
                if (!cloudIds.has(id)) {
                  const withSynced = { ...m, synced: false };
                  byId.set(id, withSynced);
                  saveMeetingToDB(withSynced).catch(() => {});
                }
              });
              const merged = Array.from(byId.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setMeetings(merged);
              setMeetingsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Failed to fetch cloud meetings', err);
        }
      }
      const localMeetings = dbMeetings.map(m => ({ ...m, synced: m.synced === true }));
      setMeetings(localMeetings);
    } catch (err) {
      console.error('Failed to load meetings from DB', err);
    } finally {
      setMeetingsLoading(false);
    }
  };

  const saveMeeting = async (newAnalysis: AnalysisResult, mediaBlob: Blob, language?: string, durationOverride?: number) => {
    const durationSec = durationOverride ?? recordingTime;
    const isVideo = mediaBlob.type.startsWith('video/');
    const newMeeting: Meeting = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: (newAnalysis.summary || '').split('\n')[0].substring(0, 50) + (newAnalysis.summary && newAnalysis.summary.length > 50 ? '...' : ''),
      analysis: newAnalysis,
      audioBlob: storeAudio && !isVideo ? mediaBlob : undefined,
      videoBlob: storeAudio && isVideo ? mediaBlob : undefined,
      analysisLanguage: language ?? outputLanguage,
      originalAnalysis: newAnalysis,
    };
    
    try {
      await saveMeetingToDB(newMeeting);
      const updated = [newMeeting, ...meetings];
      setMeetings(updated);
      setCurrentMeetingId(newMeeting.id);
      setPendingAudioBlob(null);
      setPendingVideoBlob(null);
      setAudioUrl(mediaBlob ? URL.createObjectURL(mediaBlob) : null);
      setVideoUrl(isVideo && mediaBlob ? URL.createObjectURL(mediaBlob) : null);

      // Sync usage with server
      if (user) {
        await syncMeetingUsage(newMeeting.id, newMeeting.title, durationSec);
      }
      // Save to cloud if Pro (or admin) + cloud save enabled
      if (user && (user.plan_features?.cloud_save || user.role === 'admin') && cloudSaveEnabled) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const saveRes = await fetch('/api/meetings/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                id: newMeeting.id,
                title: newMeeting.title,
                date: newMeeting.date,
                durationSeconds: durationSec,
                transcript: newAnalysis.transcript,
                analysis: newAnalysis,
              }),
            });
            if (saveRes.ok) {
              const meetingWithSynced = { ...newMeeting, synced: true };
              setMeetings(prev => prev.map(m => m.id === newMeeting.id ? meetingWithSynced : m));
              saveMeetingToDB(meetingWithSynced).catch(() => {});
              if (storeAudio && mediaBlob) {
                try {
                  const fd = new FormData();
                  fd.append('media', mediaBlob, 'recording.webm');
                  const uploadRes = await fetch(`/api/meetings/${newMeeting.id}/upload-media`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                  });
                  if (uploadRes.ok) {
                    const meetingWithMedia = { ...meetingWithSynced, mediaUrl: `/api/meetings/${newMeeting.id}/media` };
                    setMeetings(prev => prev.map(m => m.id === newMeeting.id ? meetingWithMedia : m));
                    saveMeetingToDB(meetingWithMedia).catch(() => {});
                  }
                } catch (uploadErr) {
                  console.error('Failed to upload media to cloud', uploadErr);
                }
              }
            } else {
              console.error('Cloud save failed', saveRes.status);
            }
          }
        } catch (err) {
          console.error('Failed to save meeting to cloud', err);
        }
      }
    } catch (err) {
      console.error('Failed to save meeting to DB', err);
      setError('Failed to save meeting history. Your browser may be out of storage space.');
    }
  };

  const syncMeetingToCloud = async (meetingId: string): Promise<boolean> => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting || meeting.synced) return false;
    if (!user || (!user.plan_features?.cloud_save && user.role !== 'admin') || !cloudSaveEnabled) return false;
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const saveRes = await fetch('/api/meetings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: meeting.id,
          title: meeting.title,
          date: meeting.date,
          durationSeconds: 0,
          transcript: meeting.analysis.transcript,
          analysis: meeting.analysis,
        }),
      });
      if (!saveRes.ok) return false;
      const synced = { ...meeting, synced: true };
      setMeetings(prev => prev.map(m => m.id === meetingId ? synced : m));
      saveMeetingToDB(synced).catch(() => {});
      const mediaBlob = meeting.audioBlob || meeting.videoBlob;
      if (storeAudio && mediaBlob) {
        try {
          const fd = new FormData();
          fd.append('media', mediaBlob, 'recording.webm');
          const uploadRes = await fetch(`/api/meetings/${meeting.id}/upload-media`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          if (uploadRes.ok) {
            const withMedia = { ...synced, mediaUrl: `/api/meetings/${meeting.id}/media` };
            setMeetings(prev => prev.map(m => m.id === meetingId ? withMedia : m));
            saveMeetingToDB(withMedia).catch(() => {});
          }
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  };

  const performDeleteMeeting = async (id: string) => {
    try {
      await deleteMeetingFromDB(id);
      const updated = meetings.filter(m => m.id !== id);
      setMeetings(updated);
      if (currentMeetingId === id) {
        setCurrentMeetingId(null);
        setAnalysis(null);
        setAudioUrl(null);
        setShowDashboard(true);
        setShowSupportChat(false);
      }
    } catch (err) {
      console.error('Failed to delete meeting', err);
    }
  };

  const deleteMeeting = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await performDeleteMeeting(id);
  };

  const updateMeetingTitle = async (id: string, newTitle: string) => {
    const meeting = meetings.find(m => m.id === id);
    if (!meeting) return;

    const updatedMeeting = { ...meeting, title: newTitle };
    try {
      await saveMeetingToDB(updatedMeeting);
      setMeetings(meetings.map(m => m.id === id ? updatedMeeting : m));
    } catch (err) {
      console.error('Failed to update meeting title', err);
    }
  };

  const normalizeAnalysis = (a: AnalysisResult | undefined): AnalysisResult => {
    const x = (a ?? {}) as Partial<AnalysisResult>;
    return {
      ...x,
      transcript: x.transcript ?? '',
      summary: x.summary ?? '',
      actionItems: Array.isArray(x.actionItems) ? x.actionItems : [],
      keyDecisions: Array.isArray(x.keyDecisions) ? x.keyDecisions : [],
      sentiment: x.sentiment ?? '',
      followUpEmail: x.followUpEmail ?? '',
    };
  };

  const loadMeeting = async (meeting: Meeting, openTab?: 'summary' | 'insights' | 'transcript' | 'actionItems' | 'email') => {
    setCurrentMeetingId(meeting.id);
    setShowDashboard(false);
    setShowProfile(false);
    setShowHistoryView(false);
    setShowSupportChat(false);
    setAnalysis(normalizeAnalysis(meeting.analysis));
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    if (openTab) setActiveTab(openTab);
    const blob = meeting.videoBlob || meeting.audioBlob;
    if (blob) {
      setAudioUrl(URL.createObjectURL(blob));
      setVideoUrl(meeting.videoBlob ? URL.createObjectURL(meeting.videoBlob) : null);
    } else if (meeting.mediaUrl) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(meeting.mediaUrl, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const mediaBlob = await res.blob();
          const url = URL.createObjectURL(mediaBlob);
          setAudioUrl(url);
          setVideoUrl(mediaBlob.type.startsWith('video/') ? url : null);
        } else {
          setAudioUrl(null);
          setVideoUrl(null);
        }
      } catch {
        setAudioUrl(null);
        setVideoUrl(null);
      }
    } else {
      setAudioUrl(null);
      setVideoUrl(null);
    }
    setTranscriptSegments([]);
    setLiveTranscriptError(null);
    setError(null);
    setTranslationError(null);
    setLastFailedLanguage(null);
    if (!isDesktop) {
      setIsMobileMenuOpen(false);
    }
    const newPath = `/meetings/${meeting.id}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ meetingId: meeting.id }, '', newPath);
    }
  };

  const navigateToDashboard = () => {
    setCurrentMeetingId(null);
    setShowDashboard(true);
    setShowProfile(false);
    setShowHistoryView(false);
    setShowSupportChat(false);
    setShowScheduleView(false);
    if (!isDesktop) setIsMobileMenuOpen(false);
    if (window.location.pathname !== '/dashboard') {
      window.history.pushState({ view: 'dashboard' }, '', '/dashboard');
    }
  };

  const navigateToHistory = () => {
    setCurrentMeetingId(null);
    setShowDashboard(false);
    setShowProfile(false);
    setShowHistoryView(true);
    setShowSupportChat(false);
    setShowScheduleView(false);
    if (!isDesktop) setIsMobileMenuOpen(false);
    if (window.location.pathname !== '/history') {
      window.history.pushState({ view: 'history' }, '', '/history');
    }
  };

  const navigateToSchedule = () => {
    setCurrentMeetingId(null);
    setShowDashboard(false);
    setShowProfile(false);
    setShowHistoryView(false);
    setShowSupportChat(false);
    setShowScheduleView(true);
    if (!isDesktop) setIsMobileMenuOpen(false);
    if (window.location.pathname !== '/schedule') {
      window.history.pushState({ view: 'schedule' }, '', '/schedule');
    }
  };

  const navigateToSupport = () => {
    setCurrentMeetingId(null);
    setShowDashboard(false);
    setShowProfile(false);
    setShowHistoryView(false);
    setShowSupportChat(true);
    setShowScheduleView(false);
    if (!isDesktop) setIsMobileMenuOpen(false);
    if (window.location.pathname !== '/support') {
      window.history.pushState({ view: 'support' }, '', '/support');
    }
  };

  const navigateToProfile = () => {
    setCurrentMeetingId(null);
    setShowDashboard(false);
    setShowProfile(true);
    setShowHistoryView(false);
    setShowSupportChat(false);
    setShowScheduleView(false);
    setUserMenuOpen(false);
    if (!isDesktop) setIsMobileMenuOpen(false);
    if (window.location.pathname !== '/profile') {
      window.history.pushState({ view: 'profile' }, '', '/profile');
    }
  };

  const startNewMeeting = () => {
    setCurrentMeetingId(null);
    setShowDashboard(false);
    setShowProfile(false);
    setShowHistoryView(false);
    setShowSupportChat(false);
    setShowScheduleView(false);
    setAnalysis(null);
    setAudioUrl(null);
    setVideoUrl(null);
    setPendingAudioBlob(null);
    setPendingVideoBlob(null);
    setTranscriptSegments([]);
    setLiveTranscriptError(null);
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setError(null);
    setTranslationError(null);
    setLastFailedLanguage(null);
    setIsRecordingError(false);
    if (!isDesktop) {
      setIsMobileMenuOpen(false);
    }
    if (window.location.pathname !== '/record') {
      window.history.pushState({ view: 'record' }, '', '/record');
    }
  };

  const stopAllStreams = () => {
    streamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    streamsRef.current = [];
  };

  const startRecording = async () => {
    const isUnlimited = (usage as any)?.isUnlimited || user?.role === 'admin';
    if (usage && !isUnlimited && usage.remainingSeconds <= 0) {
      setError('You have reached your monthly recording limit. Please upgrade your plan to continue recording.');
      return;
    }

    try {
      setError(null);
      setIsRecordingError(false);
      setAnalysis(null);
      setAudioUrl(null);
      setVideoUrl(null);
      setPendingAudioBlob(null);
      setPendingVideoBlob(null);
      setTranscriptSegments([]);
      setLiveTranscriptError(null);
      setCurrentMeetingId(null);
      stopAllStreams();

      const streamsToMix: MediaStream[] = [];

      const wantsVideo = recordVideo && (recordingSource === 'tab' || recordingSource === 'both');
      let tabStreamForVideo: MediaStream | null = null;

      // getDisplayMedia MUST be called before getUserMedia to preserve the user gesture
      if (recordingSource === 'tab' || recordingSource === 'both') {
        const tabStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        const tabAudioTracks = tabStream.getAudioTracks();
        if (tabAudioTracks.length === 0) {
          stopAllStreams();
          throw new Error(t('recording.tabAudioHint'));
        }
        
        if (!wantsVideo) {
          tabStream.getVideoTracks().forEach(track => track.stop());
        } else {
          tabStreamForVideo = tabStream;
        }
        streamsToMix.push(tabStream);
        streamsRef.current.push(tabStream);
      }

      if (recordingSource === 'mic' || recordingSource === 'both') {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamsToMix.push(micStream);
        streamsRef.current.push(micStream);
      }

      let finalStream: MediaStream;

      if (streamsToMix.length === 0) {
        throw new Error('No audio sources selected or available.');
      } else if (streamsToMix.length > 1) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const dest = audioContext.createMediaStreamDestination();
        streamsToMix.forEach(stream => {
          const sourceNode = audioContext.createMediaStreamSource(stream);
          sourceNode.connect(dest);
        });
        finalStream = dest.stream;
        if (wantsVideo && tabStreamForVideo) {
          const videoTrack = tabStreamForVideo.getVideoTracks()[0];
          if (videoTrack) finalStream.addTrack(videoTrack);
        }
      } else {
        finalStream = streamsToMix[0];
      }

      let mimeType = wantsVideo ? 'video/webm' : 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (wantsVideo && MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (!wantsVideo && MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (!wantsVideo && MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = ''; // Let the browser decide
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(finalStream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          if (wantsVideo) {
            videoChunksRef.current.push(event.data);
          } else {
            audioChunksRef.current.push(event.data);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        const chunks = wantsVideo ? videoChunksRef.current : audioChunksRef.current;
        const blobType = mediaRecorder.mimeType || (wantsVideo ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunks, { type: blobType });
        const url = URL.createObjectURL(blob);
        if (wantsVideo) {
          setVideoUrl(url);
          setPendingVideoBlob(blob);
          setAudioUrl(url);
          setPendingAudioBlob(blob);
        } else {
          setAudioUrl(url);
          setPendingAudioBlob(blob);
          setVideoUrl(null);
          setPendingVideoBlob(null);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      const recordingCap = (user?.plan_features?.pro_analysis_enabled || user?.plan_features?.cloud_save || user?.role === 'admin') ? 7200 : 2700;
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          const currentUsage = usageRef.current;
          const isUnlim = currentUsage?.isUnlimited || user?.role === 'admin';
          const effectiveRemaining = isUnlim ? recordingCap : (currentUsage?.remainingSeconds ?? recordingCap);
          const maxTime = Math.min(recordingCap, effectiveRemaining);
          
          if (newTime >= maxTime) {
            stopRecording();
            setError(!isUnlim && currentUsage && currentUsage.remainingSeconds < recordingCap 
              ? 'Monthly recording limit reached.' 
              : `Maximum recording length (${recordingCap / 60} minutes) reached.`);
            return prev;
          }
          return newTime;
        });
      }, 1000);

      // Start Real-time transcription (visual feedback) — only when mic is used
      const wantsLiveTranscript = recordingSource === 'mic' || recordingSource === 'both';
      const startWebSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          const bcp47 = LANGUAGE_TO_BCP47[outputLanguage];
          if (bcp47) recognition.lang = bcp47;

          recognition.onresult = (event: any) => {
            let currentInterim = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                currentInterim += event.results[i][0].transcript;
              }
            }
            if (finalTranscript) {
              const trimmed = finalTranscript.trim();
              if (trimmed) {
                setTranscriptSegments(prev => [...prev, { text: trimmed, isFinal: true }]);
                setLiveTranscriptError(null);
              }
            }
            setInterimTranscript(currentInterim);
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
            const msg = event.error === 'no-speech' ? t('recording.liveTranscriptErrorNoSpeech')
              : event.error === 'audio-capture' ? t('recording.liveTranscriptErrorAudioCapture')
              : event.error === 'not-allowed' ? t('recording.liveTranscriptErrorNotAllowed')
              : event.error === 'network' ? t('recording.liveTranscriptErrorNetwork')
              : t('recording.liveTranscriptErrorGeneric');
            setLiveTranscriptError(msg);
          };

          recognition.onend = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try { recognition.start(); } catch (e) { console.warn('Failed to restart speech recognition'); }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition failed to start:', e);
        }
      };

      if (wantsLiveTranscript) {
        try {
          const availRes = await fetch('/api/transcribe/available');
          const availData = await availRes.json();
          if (availData.available) {
            const micStream = recordingSource === 'mic' ? streamsToMix[0] : streamsToMix[1];
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const sampleRate = ctx.sampleRate;
            const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProto}//${window.location.host}/api/transcribe/stream?language=${encodeURIComponent(outputLanguage)}&sample_rate=${sampleRate}`;
            const ws = new WebSocket(wsUrl);
            transcribeWsRef.current = ws;

            const wsReady = new Promise<boolean>((resolve) => {
              const t = setTimeout(() => resolve(false), 3000);
              ws.onopen = () => { clearTimeout(t); resolve(true); };
              ws.onerror = () => { clearTimeout(t); resolve(false); };
              ws.onclose = () => { clearTimeout(t); resolve(false); };
            });

            ws.onmessage = (ev) => {
              try {
                const data = JSON.parse(ev.data as string);
                if (data.error) {
                  setLiveTranscriptError(data.error);
                  return;
                }
                if (data.transcript) {
                  if (data.isFinal) {
                    setTranscriptSegments(prev => [...prev, { text: data.transcript, isFinal: true }]);
                    setInterimTranscript('');
                    setLiveTranscriptError(null);
                  } else {
                    setInterimTranscript(data.transcript);
                  }
                }
              } catch (_) {}
            };

            if (await wsReady && ws.readyState === WebSocket.OPEN) {
              transcribeAudioContextRef.current = ctx;
              const src = ctx.createMediaStreamSource(micStream);
              const processor = ctx.createScriptProcessor(4096, 1, 0);
              transcribeProcessorRef.current = processor;
              processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const input = e.inputBuffer.getChannelData(0);
                const buf = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                  const s = Math.max(-1, Math.min(1, input[i]));
                  buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                ws.send(buf.buffer);
              };
              src.connect(processor);
              const gain = ctx.createGain();
              gain.gain.value = 0;
              processor.connect(gain);
              gain.connect(ctx.destination);
            } else {
              ws.close();
              transcribeWsRef.current = null;
              startWebSpeechRecognition();
            }
            ws.onclose = () => {
              transcribeWsRef.current = null;
              transcribeProcessorRef.current?.disconnect();
              transcribeAudioContextRef.current?.close();
            };
            ws.onerror = () => {
              if (ws.readyState !== WebSocket.OPEN) startWebSpeechRecognition();
            };
          } else {
            startWebSpeechRecognition();
          }
        } catch (_) {
          startWebSpeechRecognition();
        }
      }

    } catch (err: any) {
      let errorMessage = 'Failed to start recording. Please check permissions.';
      
      if (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission denied')) {
        errorMessage = 'Permission denied. Please ensure you allow microphone and/or screen recording access when prompted by your browser. On macOS, you may need to enable Screen Recording permissions for your browser in System Settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Requested recording device not found. Please ensure you have a microphone connected.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Could not access the recording device. It may be in use by another application.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsRecordingError(true);
      console.error('Recording error:', err);
      stopAllStreams();
    }
  };

  const stopTranscribeStream = () => {
    const ws = transcribeWsRef.current;
    if (ws) {
      try { ws.close(); } catch (_) {}
      transcribeWsRef.current = null;
    }
    transcribeProcessorRef.current?.disconnect();
    transcribeProcessorRef.current = null;
    transcribeAudioContextRef.current?.close();
    transcribeAudioContextRef.current = null;
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      stopTranscribeStream();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      const recordingCap = (user?.plan_features?.pro_analysis_enabled || user?.plan_features?.cloud_save || user?.role === 'admin') ? 7200 : 2700;
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          const currentUsage = usageRef.current;
          const isUnlim = currentUsage?.isUnlimited || user?.role === 'admin';
          const effectiveRemaining = isUnlim ? recordingCap : (currentUsage?.remainingSeconds ?? recordingCap);
          const maxTime = Math.min(recordingCap, effectiveRemaining);
          
          if (newTime >= maxTime) {
            stopRecording();
            setError(!isUnlim && currentUsage && currentUsage.remainingSeconds < recordingCap 
              ? 'Monthly recording limit reached.' 
              : `Maximum recording length (${recordingCap / 60} minutes) reached.`);
            return prev;
          }
          return newTime;
        });
      }, 1000);
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setShowStopConfirm(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopTranscribeStream();
      stopAllStreams();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    }
  };

  const requestStopRecording = () => {
    if (recordingTime > 120) {
      setShowStopConfirm(true);
    } else {
      stopRecording();
    }
  };

  const analyzeAudio = async (blob: Blob | null, language: string) => {
    if (!blob) return;
    if (isAnalyzing) return;

    const MAX_FILE_SIZE = 200 * 1024 * 1024;
    if (blob.size > MAX_FILE_SIZE) {
      setError('Audio file is too large (max 200MB). Please record a shorter meeting.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStage('Preparing audio...');
    setError(null);
    try {
      const controller = new AbortController();
      analyzeAbortRef.current = controller;

      let extraRules = '';
      if (user) {
        try {
          const token = localStorage.getItem('token');
          const rulesRes = await fetch('/api/user/prompt-rules', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (rulesRes.ok) {
            const rules = await rulesRes.json();
            if (rules && rules.length > 0) {
              extraRules = '\n\nADDITIONAL RULES BASED ON PAST FEEDBACK:\n' + rules.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');
            }
          }
        } catch (e) {
          console.error('Failed to fetch prompt rules', e);
        }
      }

      setAnalysisStage(blob.size > 15 * 1024 * 1024 ? 'Uploading audio to server...' : 'Sending audio for analysis...');

      const formData = new FormData();
      const filename = blob instanceof File ? blob.name : 'recording.' + (blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm');
      formData.append('audio', blob, filename);
      formData.append('language', language);
      formData.append('extraRules', extraRules);
      formData.append('isPro', (user?.plan_features?.pro_analysis_enabled || user?.role === 'admin') ? 'true' : 'false');

      const token = localStorage.getItem('token');

      setAnalysisStage('AI is analyzing your meeting...');

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (!res.ok) {
        const errMsg = parsed?.error || text || `Server returned ${res.status}`;
        throw new Error(errMsg);
      }
      if (!parsed) throw new Error('Invalid response from server');
      setAnalysis(parsed);
      saveMeeting(parsed, blob, language);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Analysis cancelled.');
        return;
      }
      setError('Failed to analyze the audio. ' + (err.message || 'Please try again.'));
      console.error(err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
      analyzeAbortRef.current = null;
    }
  };

  const cancelAnalysis = () => {
    try {
      analyzeAbortRef.current?.abort();
    } catch {}
    analyzeAbortRef.current = null;
    setIsAnalyzing(false);
    setAnalysisStage('');
  };

  const reanalyzeMeetingInLanguage = async (newLanguage: string) => {
    if (!currentMeetingId) return;
    const meeting = meetings.find(m => m.id === currentMeetingId);
    if (!meeting) return;
    if ((meeting.analysisLanguage ?? 'Original Language') === newLanguage) return;
    if (isReanalyzing || isAnalyzing) return;

    setIsReanalyzing(true);
    setError(null);
    setTranslationError(null);
    try {
      if (newLanguage === 'Original Language') {
        const original = meeting.originalAnalysis ?? meeting.analysis;
        const updatedMeeting: Meeting = {
          ...meeting,
          analysis: original,
          analysisLanguage: 'Original Language',
        };
        await saveMeetingToDB(updatedMeeting);
        setMeetings(meetings.map(m => m.id === currentMeetingId ? updatedMeeting : m));
        setAnalysis(original);
        return;
      }

      const cache = meeting.translationCache ?? {};
      if (cache[newLanguage]) {
        const updatedMeeting: Meeting = {
          ...meeting,
          analysis: cache[newLanguage],
          analysisLanguage: newLanguage,
        };
        await saveMeetingToDB(updatedMeeting);
        setMeetings(meetings.map(m => m.id === currentMeetingId ? updatedMeeting : m));
        setAnalysis(cache[newLanguage]);
        return;
      }

      const translationCount = Object.keys(cache).length;
      const limit = usage?.languageChangesLimit ?? 2;
      if (limit !== -1 && translationCount >= limit) {
        throw new Error('Language change limit reached for this meeting. Upgrade to Pro for unlimited.');
      }

      const sourceAnalysis = meeting.originalAnalysis ?? meeting.analysis;
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please sign in to translate');
      let analysisPayload: any;
      try {
        analysisPayload = JSON.parse(JSON.stringify(sourceAnalysis));
      } catch {
        analysisPayload = sourceAnalysis;
      }
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysis: analysisPayload,
          targetLanguage: newLanguage,
          translationCount,
        }),
      });

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (!res.ok) {
        const errMsg = parsed?.error || text || `Server returned ${res.status}`;
        throw new Error(errMsg);
      }

      if (!parsed) throw new Error('Invalid response from server');
      const newCache = { ...cache, [newLanguage]: parsed };
      const updatedMeeting: Meeting = {
        ...meeting,
        analysis: parsed,
        analysisLanguage: newLanguage,
        translationCache: newCache,
      };
      await saveMeetingToDB(updatedMeeting);
      setMeetings(meetings.map(m => m.id === currentMeetingId ? updatedMeeting : m));
      setAnalysis(parsed);
    } catch (err: any) {
      const msg = err?.message || '';
      const userMsg = msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')
        ? msg
        : 'Translation failed. Check your connection and try again.';
      setTranslationError(userMsg);
      setLastFailedLanguage(newLanguage);
      setError(userMsg);
      console.error(err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const retryTranslation = () => {
    if (lastFailedLanguage) {
      setTranslationError(null);
      setLastFailedLanguage(null);
      setError(null);
      reanalyzeMeetingInLanguage(lastFailedLanguage);
    }
  };

  const reanalyzeMeeting = async (language: string) => {
    if (!currentMeetingId) return;
    const meeting = meetings.find(m => m.id === currentMeetingId);
    if (!meeting) return;
    const mediaBlob = meeting.videoBlob || meeting.audioBlob;
    if (!mediaBlob) {
      setError("Audio was not stored. Enable 'Store audio' in Settings when recording to re-analyze.");
      return;
    }
    if (isReanalyzing || isAnalyzing) return;

    setReanalyzeDropdownOpen(false);
    setIsReanalyzing(true);
    setError(null);
    try {
      let extraRules = '';
      if (user) {
        try {
          const token = localStorage.getItem('token');
          const rulesRes = await fetch('/api/user/prompt-rules', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (rulesRes.ok) {
            const rules = await rulesRes.json();
            if (rules && rules.length > 0) {
              extraRules = '\n\nADDITIONAL RULES BASED ON PAST FEEDBACK:\n' + rules.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');
            }
          }
        } catch (e) {
          console.error('Failed to fetch prompt rules', e);
        }
      }

      const formData = new FormData();
      const ext = mediaBlob.type.includes('mp4') ? 'mp4' : mediaBlob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', mediaBlob, 'recording.' + ext);
      formData.append('language', language);
      formData.append('extraRules', extraRules);
      formData.append('isPro', (user?.plan_features?.pro_analysis_enabled || user?.role === 'admin') ? 'true' : 'false');

      const token = localStorage.getItem('token');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (!res.ok) throw new Error(parsed?.error || text || `Server returned ${res.status}`);
      if (!parsed) throw new Error('Invalid response from server');

      const updatedMeeting: Meeting = {
        ...meeting,
        analysis: parsed,
        originalAnalysis: parsed,
        analysisLanguage: language,
        translationCache: {},
      };
      await saveMeetingToDB(updatedMeeting);
      setMeetings(meetings.map(m => m.id === currentMeetingId ? updatedMeeting : m));
      setAnalysis(parsed);
    } catch (err: any) {
      setError('Failed to re-analyze. ' + (err.message || 'Please try again.'));
      console.error(err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'] as const;
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, i);
    const digits = i >= 2 ? 1 : 0;
    return `${value.toFixed(digits)} ${units[i]}`;
  };

  const formatDuration = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const estimateEtaRangeSec = (durationSeconds: number, bytes: number, stage: string) => {
    const mins = Math.max(0, durationSeconds) / 60;
    const baseMin = 20;
    const baseMax = 45;
    const perMinMin = 2.2;
    const perMinMax = 5.0;
    const analysisMin = baseMin + mins * perMinMin;
    const analysisMax = baseMax + mins * perMinMax;

    // Very rough upload estimate for UX only; keep conservative and bounded.
    const upload = bytes > 0 ? Math.min(180, Math.max(5, (bytes * 8) / 8_000_000)) : 0; // assume ~8 Mbps
    const uploadMin = upload * 0.6;
    const uploadMax = upload * 1.6;

    const wantsUpload = /upload|sending/i.test(stage || '');
    const min = Math.round((analysisMin + (wantsUpload ? uploadMin : 0)));
    const max = Math.round((analysisMax + (wantsUpload ? uploadMax : 0)));
    return { min, max };
  };

  const formatEtaRange = (minSec: number, maxSec: number) => {
    const clamp = (n: number) => Math.max(5, Math.min(60 * 20, n));
    const a = clamp(minSec);
    const b = clamp(maxSec);
    const fmt = (sec: number) => sec < 90 ? `${Math.round(sec)}s` : `${Math.round(sec / 60)}m`;
    return `${fmt(a)}–${fmt(Math.max(a + 5, b))}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    if (!currentMeetingId) return;
    const meeting = meetings.find(m => m.id === currentMeetingId);
    if (!meeting) return;

    try {
      setIsSharing(true);
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        alert('Please sign in to share meetings.');
        return;
      }
      const res = await fetch(`/api/meetings/${meeting.id}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const text = await res.text();
      let parsed: { shareUrl?: string; error?: string };
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }
      if (res.ok && parsed.shareUrl) {
        await navigator.clipboard.writeText(parsed.shareUrl);
        alert('Share link copied to clipboard!');
      } else {
        const msg = res.status === 404
          ? 'Meeting not in cloud. Save this meeting with cloud save enabled to share it.'
          : (parsed?.error || 'Failed to generate share link.');
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to share meeting.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleGetStarted = () => {
    if (!user) {
      window.history.pushState({}, '', '/signup');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      setView('app');
      window.history.pushState({}, '', '/dashboard');
      setCurrentMeetingId(null);
      setShowDashboard(true);
      setShowProfile(false);
      setShowHistoryView(false);
      setShowSupportChat(false);
    }
  };

  const navigateToCheckout = (planId?: string) => {
    const path = planId ? `/checkout?plan=${encodeURIComponent(planId)}` : '/checkout';
    setView('home');
    setCurrentPath('/checkout');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (user?.role === 'admin' && adminViewMode !== 'user') {
    return <AdminDashboard />;
  }

  if ((view === 'home' || !user) && !(user?.role === 'admin' && adminViewMode === 'user')) {
    const renderPublicPage = () => {
      switch (currentPath) {
        case '/':
          return <HomePage onGetStarted={handleGetStarted} onSelectPlan={(planId) => navigateToCheckout(planId)} />;
        case '/landing':
          return <LandingPageRoute onGetStarted={handleGetStarted} onSelectPlan={(planId) => navigateToCheckout(planId)} />;
        case '/pricing':
          return <PricingPage onGetStarted={handleGetStarted} onSelectPlan={(planId) => navigateToCheckout(planId)} />;
        case '/about':
          return <AboutPage />;
        case '/contact':
          return <ContactPage />;
        case '/privacy':
          return <PrivacyPage />;
        case '/terms':
          return <TermsPage />;
        case '/login':
          return <LoginPage />;
        case '/signup':
          return <SignupPage />;
        case '/checkout':
          return <CheckoutPage />;
        default:
          return <HomePage onGetStarted={handleGetStarted} onSelectPlan={(planId) => navigateToCheckout(planId)} />;
      }
    };
    const page = renderPublicPage();
    return (
      <>
        {page}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        spotlightClicks={true}
        scrollToFirstStep={true}
        spotlightPadding={16}
        tooltipComponent={TourTooltip}
        callback={handleJoyrideCallback}
        locale={{ back: t('joyride.back'), close: t('joyride.close'), last: t('joyride.last'), next: t('joyride.next'), skip: t('joyride.skip') }}
        styles={{
          options: {
            primaryColor: '#4f46e5',
            zIndex: 10000,
          },
        }}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
      {(() => {
        const activeView: UserSidebarView = showProfile
          ? 'profile'
          : showSupportChat
          ? 'support'
          : showScheduleView
          ? 'schedule'
          : showHistoryView
          ? 'history'
          : showDashboard && !currentMeetingId
          ? 'dashboard'
          : 'record';
        const sidebarVisible = isDesktop || isMobileMenuOpen;
        return (
          <>
            <UserSidebar
              isVisible={sidebarVisible}
              isCollapsed={isDesktopSidebarCollapsed}
              onToggleCollapse={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
              activeView={activeView}
              onNavigate={(view: UserSidebarView) => {
                if (view === 'dashboard') navigateToDashboard();
                else if (view === 'record') startNewMeeting();
                else if (view === 'history') navigateToHistory();
                else if (view === 'schedule') navigateToSchedule();
                else if (view === 'support') navigateToSupport();
              }}
              usage={usage}
              user={user}
              adminViewMode={adminViewMode}
              onBackToAdmin={user?.role === 'admin' ? () => setAdminViewMode('admin') : undefined}
              t={t}
            />
            <div
              role="button"
              tabIndex={0}
              aria-label={t('common.close')}
              onClick={() => setIsMobileMenuOpen(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsMobileMenuOpen(false)}
              className={`fixed inset-0 z-[25] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            />
          </>
        );
      })()}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden transition-all duration-300 ${isDesktopSidebarCollapsed ? 'md:ms-20' : 'md:ms-72'}`}>
        <div className="sticky top-0 z-20 shrink-0">
          <AnnouncementBar context="user_app" />
          <header className="bg-white border-b border-slate-200">
          <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {currentMeetingId && (
                <button
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      window.history.replaceState(null, '', '/');
                      setCurrentMeetingId(null);
                      setShowDashboard(!showHistoryView);
                      setShowHistoryView(showHistoryView);
                      if (!isDesktop) setIsMobileMenuOpen(false);
                    }
                  }}
                  className="flex items-center gap-1.5 p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0"
                  title={showHistoryView ? t('nav.backToHistory') : t('nav.backToDashboard')}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">{showHistoryView ? t('nav.backToHistory') : t('nav.backToDashboard')}</span>
                </button>
              )}
              {!currentMeetingId && (
                <button
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                  title={isMobileMenuOpen ? t('admin.collapseSidebar') : t('admin.expandSidebar')}
                  aria-label={isMobileMenuOpen ? t('admin.collapseSidebar') : t('admin.expandSidebar')}
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-slate-800 truncate">
                {showSupportChat ? t('nav.support') : showHistoryView ? t('nav.meetingHistory') : showProfile ? t('nav.profileSettings') : showDashboard ? t('nav.dashboard') : currentMeetingId ? t('nav.meetingDetails') : t('nav.recordMeeting')}
              </h2>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <LanguageSwitcher variant="compact" />
              {!currentMeetingId && !showDashboard && !showProfile && !showHistoryView && !showSupportChat && (() => {
                const status = isRecording
                  ? (isPaused ? { label: t('recording.paused'), dot: 'bg-amber-500' } : { label: t('recording.recording'), dot: 'bg-red-500 animate-pulse' })
                  : isAnalyzing
                    ? { label: t('recording.analyzing'), dot: 'bg-indigo-500 animate-pulse' }
                    : { label: t('recording.ready'), dot: 'bg-emerald-500' };
                return (
                  <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                    {status.label}
                  </div>
                );
              })()}
              {currentMeetingId && analysis && (user?.plan_features?.cloud_save || user?.role === 'admin') && cloudSaveEnabled && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="tour-user-menu flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold shrink-0">
                    {user?.name?.trim() ? user.name.trim().slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                    {user?.name?.trim() || user?.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    {usage && user?.role !== 'admin' && (
                      <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500">
                        {t('nav.minUsed', { used: Math.ceil(usage.usedSeconds / 60), limit: usage.limitMinutes })}
                      </div>
                    )}
                    <button
                      onClick={navigateToProfile}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      {t('nav.profile')}
                    </button>
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setUserMenuOpen(false);
                      }}
                      className="tour-settings w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      {t('nav.settings')}
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('hasSeenTour');
                        setRunTour(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      {t('joyride.restartTour')}
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setView('home');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto !overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-8">
          {!isOnline && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
              {t('common.offline')}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{t('common.error')}</h3>
                <p className="text-sm mt-1 opacity-90">{error}</p>
                {translationError && lastFailedLanguage && (
                  <button
                    onClick={retryTranslation}
                    className="mt-3 px-4 py-2 text-sm font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                  >
                    {t('common.retry')}
                  </button>
                )}
                {isRecordingError && !currentMeetingId && !analysis && !showDashboard && !showProfile && !showHistoryView && !showSupportChat && (
                  <button
                    onClick={() => { setError(null); setIsRecordingError(false); startRecording(); }}
                    className="mt-3 px-4 py-2 text-sm font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                  >
                    {t('recording.retry')}
                  </button>
                )}
              </div>
            </div>
          )}

          {showDashboard && !currentMeetingId && !showProfile && !showHistoryView && !showSupportChat && (
            <DashboardView
              meetings={meetings}
              meetingsLoading={meetingsLoading}
              user={user}
              usage={usage}
              usageLoading={usageLoading}
              userAnalytics={userAnalytics}
              userAnalyticsLoading={userAnalyticsLoading}
              analyticsDays={analyticsDays}
              setAnalyticsDays={setAnalyticsDays}
              meetingsSearch={meetingsSearch}
              setMeetingsSearch={setMeetingsSearch}
              onLoadMeeting={loadMeeting}
              onNavigateToHistory={navigateToHistory}
              onNavigateToSupport={navigateToSupport}
              onNavigateToCheckout={() => navigateToCheckout()}
              onStartNewMeeting={startNewMeeting}
              onRefresh={() => {
                fetchUsage();
                fetchUserAnalytics(analyticsDays);
              }}
            />
          )}

          {showProfile && (
            <ProfileView
              onPreferencesChange={fetchPreferences}
              onNavigateToCheckout={() => navigateToCheckout()}
            />
          )}

          {showSupportChat && (
            <SupportView
              user={user}
              supportMessages={supportMessages}
              supportConversationLoading={supportConversationLoading}
              supportConversationError={supportConversationError}
              supportInput={supportInput}
              setSupportInput={setSupportInput}
              supportSending={supportSending}
              supportTyping={supportTyping}
              supportOnline={supportOnline}
              supportPendingAttachments={supportPendingAttachments}
              setSupportPendingAttachments={setSupportPendingAttachments}
              showSupportEmojiPicker={showSupportEmojiPicker}
              setShowSupportEmojiPicker={setShowSupportEmojiPicker}
              onSend={sendSupportMessage}
              onAttachFile={uploadSupportFile}
              onInputChange={handleSupportInputChange}
              onSignIn={() => setShowAuthModal(true)}
              onRetry={() => { setSupportConversationError(null); setSupportConversationRetryKey((k) => k + 1); }}
            />
          )}

          {showHistoryView && (
            <MeetingHistoryView
              meetings={meetings}
              meetingsLoading={meetingsLoading}
              onLoadMeeting={loadMeeting}
              onConfirmDelete={performDeleteMeeting}
              onUpdateTitle={updateMeetingTitle}
              onRecordNew={startNewMeeting}
              onSyncMeeting={syncMeetingToCloud}
              cloudSaveAvailable={!!((user?.plan_features?.cloud_save || user?.role === 'admin') && cloudSaveEnabled)}
            />
          )}

          {showScheduleView && (
            <ScheduleMeetingView token={token} />
          )}

          {currentMeetingId && !analysis && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-600">{t('common.loading')}</p>
              <button
                onClick={navigateToDashboard}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t('nav.backToDashboard')}
              </button>
            </div>
          )}

          {!currentMeetingId && !analysis && !showDashboard && !showProfile && !showHistoryView && !showSupportChat && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                
                {!isRecording && !isAnalyzing && !pendingAudioBlob && !pendingVideoBlob && (
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">{t('recording.recordNextMeeting')}</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                      {t('recording.captureAudio')}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                        <Lock className="w-3.5 h-3.5" />
                        {t('recording.audioPrivacy')}
                      </div>
                      {usage && (user?.plan_features?.cloud_save || user?.role === 'admin') && (
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                          <Clock className="w-3.5 h-3.5" />
                          {t('recording.unlimitedMinutes')}
                        </div>
                      )}
                      {usage && user?.role !== 'admin' && (user?.plan_id !== 'pro') && usage.remainingSeconds > 0 && (
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                          <Clock className="w-3.5 h-3.5" />
                          {t('recording.minutesRemaining', { count: Math.floor(usage.remainingSeconds / 60) })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold tracking-tight">{t('recording.analyzingMeeting')}</h2>
                      <p className="text-slate-500 max-w-xl mx-auto">
                        {analysisStage || t('recording.analyzingStage')}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 text-left">
                      {(() => {
                        const bytes = (pendingVideoBlob ?? pendingAudioBlob)?.size || 0;
                        const eta = estimateEtaRangeSec(recordingTime, bytes, analysisStage || '');
                        const etaLabel = formatEtaRange(eta.min, eta.max);
                        const elapsed = analysisElapsedSec;
                        const remainingMin = Math.max(5, eta.min - elapsed);
                        const remainingMax = Math.max(remainingMin + 5, eta.max - elapsed);

                        const stepIndex =
                          (analysisStage || '').includes('Preparing') ? 0 :
                          (analysisStage || '').includes('Uploading') ? 1 :
                          (analysisStage || '').includes('Sending') ? 1 :
                          (analysisStage || '').includes('analyzing') ? 2 :
                          0;
                        const steps = ['Prepare audio', 'Upload', 'AI analysis'];
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800">{t('recording.working')}</div>
                                <div className="text-sm text-slate-500 truncate">{analysisStage || t('recording.analyzingStage')}</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                {formatDuration(recordingTime)} audio
                              </div>
                              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                {formatBytes(bytes)}
                              </div>
                              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                <Mic className="w-3.5 h-3.5 text-slate-500" />
                                {recordingSource === 'mic' ? 'Mic' : recordingSource === 'tab' ? 'Tab' : 'Mic + Tab'}
                              </div>
                              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                {outputLanguage === 'Original Language' ? 'Auto language' : outputLanguage}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Elapsed</div>
                                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formatDuration(elapsed)}</div>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estimated remaining</div>
                                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formatEtaRange(remainingMin, remainingMax)} <span className="text-xs font-medium text-slate-500">(typical)</span></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {steps.map((label, i) => {
                                const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo';
                                return (
                                  <div key={label} className={`rounded-xl border px-3 py-3 ${state === 'active' ? 'bg-white border-indigo-200' : 'bg-white/60 border-slate-200'}`}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                        state === 'done' ? 'bg-emerald-500 text-white' :
                                        state === 'active' ? 'bg-indigo-600 text-white' :
                                        'bg-slate-200 text-slate-600'
                                      }`}>
                                        {state === 'done' ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">{i + 1}</span>}
                                      </div>
                                      <div className="text-xs font-semibold text-slate-700">{label}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs text-slate-500">
                                ETA varies with length, file size, and network conditions. Typical total: {etaLabel}.
                              </div>
                              <button
                                onClick={cancelAnalysis}
                                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {!isRecording && !isAnalyzing && !pendingAudioBlob && !pendingVideoBlob && (
                  <div className="space-y-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl tour-recording-source">
                      {(['mic', 'tab', 'both'] as const).map((source) => (
                        <button
                          key={source}
                          onClick={() => {
                            setRecordingSource(source);
                            if (source === 'mic') setRecordVideo(false);
                          }}
                          className={`${source === 'mic' ? 'tour-mic-only' : source === 'tab' ? 'tour-tab-only' : 'tour-both'} px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            recordingSource === source
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {source === 'mic' && t('recording.microphoneOnly')}
                          {source === 'tab' && t('recording.tabAudioOnly')}
                          {source === 'both' && t('recording.micTabAudio')}
                        </button>
                      ))}
                    </div>
                    {(recordingSource === 'tab' || recordingSource === 'both') && (
                      <>
                        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-left max-w-md mx-auto">
                          <span className="font-medium text-amber-800">{t('recording.tabGuidanceTitle')}:</span>{' '}
                          {t('recording.tabGuidanceSteps')}
                        </div>
                        {hasVideoAccess && (
                          <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={recordVideo}
                              onChange={(e) => setRecordVideo(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {t('recording.includeScreenVideo')}
                          </label>
                        )}
                      </>
                    )}
                    {(recordingSource === 'mic' || recordingSource === 'both') && (
                      <button
                        onClick={testMicrophone}
                        disabled={isTestingMic}
                        className="tour-test-microphone inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium disabled:opacity-50"
                      >
                        {isTestingMic ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {t('recording.testMicrophone')}...
                          </>
                        ) : (
                          t('recording.testMicrophone')
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="relative flex flex-col items-center gap-6">
                  {!isRecording && !isAnalyzing && !pendingAudioBlob && !pendingVideoBlob && (
                    <>
                      <input
                        ref={uploadAudioInputRef}
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                        onChange={handleUploadAudio}
                        className="hidden"
                      />
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                          onClick={startRecording}
                          className="tour-record-button relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:scale-105"
                        >
                          <Mic className="w-10 h-10" />
                        </button>
                        <span className="text-sm text-slate-500">{t('recording.uploadOrRecord')}</span>
                        <button
                          onClick={() => uploadAudioInputRef.current?.click()}
                          className="tour-upload-audio flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          {t('recording.uploadAudioFile')}
                        </button>
                      </div>
                    </>
                  )}

                  {isAnalyzing && (
                    <button
                      disabled
                      className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-sm bg-slate-100 text-slate-400 cursor-not-allowed"
                    >
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </button>
                  )}

                  {isRecording && (
                    <div className="flex items-center gap-6">
                      <button
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-sm ${
                          isPaused 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:scale-105'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 hover:scale-105'
                        }`}
                        title={isPaused ? t('recording.resumeRecording') : t('recording.pauseRecording')}
                      >
                        {isPaused ? <Play className="w-7 h-7 ml-1" /> : <Pause className="w-7 h-7" />}
                      </button>

                      <div className="relative">
                        {!isPaused && (
                          <div className="absolute -inset-4 bg-red-100 rounded-full animate-pulse opacity-50"></div>
                        )}
                        <button
                          onClick={requestStopRecording}
                          className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-sm bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 hover:scale-105"
                          title={t('recording.stopRecording')}
                        >
                          <Square className="w-8 h-8 fill-current" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {(pendingAudioBlob || pendingVideoBlob) && !isAnalyzing && (
                  <div className="space-y-6 w-full max-w-md mx-auto animate-in fade-in zoom-in-95">
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 mb-6">
                      <h3 className="font-semibold flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        {t('recording.recordingComplete')}
                      </h3>
                      <p className="text-sm mt-1">{t('recording.audioReadyForAnalysis')}</p>
                    </div>
                    
                    <div className="space-y-3 text-left">
                      <label className="block text-sm font-medium text-slate-700">{t('recording.selectOutputLanguage')}</label>
                      <select 
                        value={outputLanguage}
                        onChange={(e) => setOutputLanguage(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      >
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">{t('recording.aiTranslateNote')}</p>
                    </div>

                    <button
                      onClick={() => analyzeAudio(pendingVideoBlob ?? pendingAudioBlob, outputLanguage)}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {analysisStage || t('recording.analyzingMeeting')}
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          {t('recording.analyzeMeeting')}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => saveWithoutAnalyzing()}
                      className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-6 py-3 rounded-xl font-medium transition-all border border-slate-200"
                    >
                      {t('recording.saveWithoutAnalyzing')}
                    </button>
                    <button
                      onClick={() => setShowDiscardConfirm(true)}
                      className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2"
                    >
                      {t('recording.discardRecordAgain')}
                    </button>
                  </div>
                )}

                <div className="h-8 flex items-center justify-center">
                  {isRecording && (
                    <div className={`flex items-center gap-2 font-mono text-xl font-medium ${isPaused ? 'text-amber-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-600' : 'bg-red-600 animate-pulse'}`}></div>
                      {formatTime(recordingTime)}
                      <span className="ml-2 text-sm font-sans font-semibold uppercase tracking-wider opacity-80">
                        {isPaused ? t('recording.paused') : t('recording.recording')}
                      </span>
                    </div>
                  )}
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-indigo-600 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {analysisStage || 'Analyzing meeting audio...'}
                    </div>
                  )}
                </div>

                {isRecording && (recordingSource === 'mic' || recordingSource === 'both') && (
                  <div className="w-full max-w-2xl mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t('recording.liveTranscript')}
                    </div>
                    {!(typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) ? (
                      <p className="text-sm text-amber-600">{t('recording.liveTranscriptUnsupported')}</p>
                    ) : liveTranscriptError ? (
                      <p className="text-sm text-amber-600">{liveTranscriptError}</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto text-sm text-slate-700" ref={transcriptScrollRef}>
                        {transcriptSegments.length === 0 && !interimTranscript ? (
                          <p className="italic text-slate-500">{t('recording.liveTranscriptListening')}</p>
                        ) : (
                          <>
                            {transcriptSegments.map((seg, i) => (
                              <span key={i}>
                                {i > 0 && ' '}{seg.text}
                              </span>
                            ))}
                            {interimTranscript && (
                              <span className="italic text-slate-400"> {interimTranscript}</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(audioUrl || videoUrl) && !isRecording && (
                  <div className="w-full max-w-md mt-4">
                    <MediaPlayer audioUrl={audioUrl} videoUrl={videoUrl} downloadFilename="recording" />
                  </div>
                )}
              </div>
            </div>
          )}

          {analysis && (
            <MeetingDetailsView
              meeting={currentMeetingId ? meetings.find(m => m.id === currentMeetingId) ?? null : null}
              analysis={analysis}
              audioUrl={audioUrl}
              videoUrl={videoUrl}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              languageOptions={LANGUAGE_OPTIONS}
              user={user}
              usage={usage}
              googleConnected={googleConnected}
              isReanalyzing={isReanalyzing}
              isSharing={isSharing}
              onTranslate={reanalyzeMeetingInLanguage}
              onReanalyze={reanalyzeMeeting}
              onShareLink={(user?.plan_features?.cloud_save || user?.role === 'admin') && cloudSaveEnabled ? handleShare : undefined}
              onShare={async () => {
                if (isSharing) return;
                setIsSharing(true);
                const text = `Meeting Summary:\n${analysis.summary}\n\nAction Items:\n${(analysis.actionItems ?? []).map(a => `- ${a.task} (${a.assignee || 'Unassigned'})`).join('\n')}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: 'Meeting Notes', text });
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      try {
                        await navigator.clipboard.writeText(text);
                        alert(t('meeting.notesCopied'));
                      } catch (clipboardErr) {
                        console.error('Clipboard fallback failed:', clipboardErr);
                      }
                    }
                  } finally {
                    setIsSharing(false);
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(text);
                    alert(t('meeting.notesCopied'));
                  } catch (err) {
                    console.error('Clipboard failed:', err);
                  } finally {
                    setIsSharing(false);
                  }
                }
              }}
              translateDropdownOpen={translateDropdownOpen}
              setTranslateDropdownOpen={setTranslateDropdownOpen}
              reanalyzeDropdownOpen={reanalyzeDropdownOpen}
              setReanalyzeDropdownOpen={setReanalyzeDropdownOpen}
              hasAudioBlob={!!meetings.find(m => m.id === currentMeetingId)?.audioBlob || !!meetings.find(m => m.id === currentMeetingId)?.videoBlob}
              onUpdateTitle={updateMeetingTitle}
              scrollToLine={scrollToLine}
              onActionItemToggle={currentMeetingId ? async (index, completed) => {
                const meeting = meetings.find(m => m.id === currentMeetingId);
                if (!meeting) return;
                const updated = {
                  ...meeting,
                  analysis: {
                    ...meeting.analysis,
                    actionItems: (meeting.analysis.actionItems ?? []).map((a, i) =>
                      i === index ? { ...a, completed } : a
                    ),
                  },
                };
                try {
                  await saveMeetingToDB(updated);
                  setMeetings(meetings.map(m => m.id === currentMeetingId ? updated : m));
                  setAnalysis(updated.analysis);
                } catch (err) {
                  console.error('Failed to update action item', err);
                }
              } : undefined}
              onSpeakerRename={currentMeetingId ? async (original, newName) => {
                const meeting = meetings.find(m => m.id === currentMeetingId);
                if (!meeting) return;
                const updated = {
                  ...meeting,
                  analysis: {
                    ...meeting.analysis,
                    speakerNames: {
                      ...meeting.analysis.speakerNames,
                      [original]: newName,
                    },
                  },
                };
                try {
                  await saveMeetingToDB(updated);
                  setMeetings(meetings.map(m => m.id === currentMeetingId ? updated : m));
                  setAnalysis(updated.analysis);
                } catch (err) {
                  console.error('Failed to update speaker name', err);
                }
              } : undefined}
              onTranscriptEdit={currentMeetingId ? async (newTranscript) => {
                const meeting = meetings.find(m => m.id === currentMeetingId);
                if (!meeting) return;
                const updated = {
                  ...meeting,
                  analysis: {
                    ...meeting.analysis,
                    transcript: newTranscript,
                  },
                };
                try {
                  await saveMeetingToDB(updated);
                  setMeetings(meetings.map(m => m.id === currentMeetingId ? updated : m));
                  setAnalysis(updated.analysis);
                } catch (err) {
                  console.error('Failed to update transcript', err);
                }
              } : undefined}
              feedbackRating={feedbackRating}
              setFeedbackRating={setFeedbackRating}
              feedbackComment={feedbackComment}
              setFeedbackComment={setFeedbackComment}
              feedbackSubmitted={feedbackSubmitted}
              onFeedbackSubmit={async () => {
                if (!feedbackRating) return alert('Please select a rating');
                try {
                  const token = localStorage.getItem('token');
                  await fetch('/api/user/feedback', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      meetingId: currentMeetingId,
                      rating: feedbackRating,
                      comment: feedbackComment
                    })
                  });
                  setFeedbackSubmitted(true);
                } catch (e) {
                  alert('Failed to submit feedback');
                }
              }}
            />
          )}
          </div>
        </main>
      </div>
      {/* Stop Recording Confirmation */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-semibold text-slate-900">{t('recording.stopConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {t('recording.stopConfirmMessage', { minutes: formatDuration(recordingTime) })}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t('recording.stopConfirmCancel')}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                {t('recording.stopConfirmStop')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Discard Recording Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-semibold text-slate-900">{t('recording.discardConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {t('recording.discardConfirmMessage')}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t('recording.discardConfirmCancel')}
              </button>
              <button
                onClick={() => { setShowDiscardConfirm(false); startNewMeeting(); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                {t('recording.discardConfirmDiscard')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                {t('settings.title')}
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.privacyData')}</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-600 leading-relaxed">
                      {t('settings.howItWorks')}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <label className={`flex items-center justify-between ${(user?.plan_id !== 'pro' && user?.role !== 'admin') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <div className="pr-4">
                        <span className="block text-sm font-medium text-slate-900 flex items-center gap-2">
                          {t('settings.saveToCloud')}
                          {(user?.plan_id !== 'pro' && user?.role !== 'admin') && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{t('settings.proOnly')}</span>
                          )}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {(user?.plan_features?.cloud_save || user?.role === 'admin')
                            ? t('settings.cloudSaveDesc')
                            : t('settings.cloudSaveUpgrade')}
                        </span>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input
                          type="checkbox"
                          name="cloudSave"
                          id="cloudSave"
                          checked={cloudSaveEnabled}
                          disabled={!user?.plan_features?.cloud_save && user?.role !== 'admin'}
                          onChange={async (e) => {
                            if (!user?.plan_features?.cloud_save && user?.role !== 'admin') return;
                            const enabled = e.target.checked;
                            try {
                              const token = localStorage.getItem('token');
                              if (!token) return;
                              const res = await fetch('/api/user/preferences', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ cloudSaveEnabled: enabled }),
                              });
                              if (res.ok) {
                                setCloudSaveEnabled(enabled);
                              } else {
                                const err = await res.json().catch(() => ({}));
                                alert(err?.error || 'Failed to update preference');
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Failed to update preference');
                            }
                          }}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-slate-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-indigo-600 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="cloudSave" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${cloudSaveEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}></label>
                      </div>
                    </label>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="pr-4">
                        <span className="block text-sm font-medium text-slate-900">{t('settings.storeAudioLocally')}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{t('settings.storeAudioDesc')}</span>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                          type="checkbox" 
                          name="toggle" 
                          id="toggle" 
                          checked={storeAudio}
                          onChange={(e) => {
                            setStoreAudio(e.target.checked);
                            localStorage.setItem('storeAudio', e.target.checked.toString());
                          }}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-slate-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-indigo-600"
                        />
                        <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${storeAudio ? 'bg-indigo-600' : 'bg-slate-300'}`}></label>
                      </div>
                    </label>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="pr-4">
                        <span className="block text-sm font-medium text-slate-900">{t('settings.sessionReplay')}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{t('settings.sessionReplayDesc')}</span>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in-out">
                        <input
                          type="checkbox"
                          name="sessionReplay"
                          id="sessionReplay"
                          checked={sessionReplayConsent}
                          onChange={async (e) => {
                            const enabled = e.target.checked;
                            try {
                              const token = localStorage.getItem('token');
                              if (!token) return;
                              const res = await fetch('/api/user/preferences', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ sessionReplayConsent: enabled }),
                              });
                              if (res.ok) {
                                setSessionReplayConsent(enabled);
                              } else {
                                const err = await res.json().catch(() => ({}));
                                alert(err?.error || 'Failed to update preference');
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Failed to update preference');
                            }
                          }}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-slate-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-indigo-600"
                        />
                        <label htmlFor="sessionReplay" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${sessionReplayConsent ? 'bg-indigo-600' : 'bg-slate-300'}`}></label>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.dataManagement')}</h3>
                <button 
                  onClick={async () => {
                    if (confirm(t('settings.deleteConfirm'))) {
                      await clearAllMeetingsFromDB();
                      setMeetings([]);
                      setCurrentMeetingId(null);
                      setAnalysis(null);
                      setAudioUrl(null);
                      setShowSettings(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl font-medium transition-colors border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('settings.deleteAllLocalData')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {showDowngradePopup && (
        <PlanDowngradePopup
          previousPlan={downgradedFromPlan}
          onContactSupport={() => { navigateToSupport(); }}
          onDismiss={() => {
            setShowDowngradePopup(false);
            localStorage.setItem('dismiss_downgrade_popup', '1');
          }}
        />
      )}
    </div>
  );
}

