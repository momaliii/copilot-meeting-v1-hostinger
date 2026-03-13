import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import LanguageSwitcher from './components/LanguageSwitcher';
import { formatCurrency as formatCurrencyUtil, formatDateTime } from './utils/format';
import { Users, Activity, Settings, LogOut, CheckCircle2, Ban, CreditCard, Edit2, Plus, X, MessageSquare, LayoutDashboard, Menu, DollarSign, TrendingUp, TrendingDown, ScrollText, Megaphone, Eye, MessageCircle, Tag, Sparkles } from 'lucide-react';
import type { Plan, UserRow, FeedbackRow, AdminPermissions, AdminPage } from './types/admin';
import AdminSidebar from './components/admin/AdminSidebar';
import AdminDashboardView from './components/admin/AdminDashboardView';
import AdminPlansView from './components/admin/AdminPlansView';
import AdminUsersView from './components/admin/AdminUsersView';
import AdminFeedbackView from './components/admin/AdminFeedbackView';
import AdminAuditView from './components/admin/AdminAuditView';
import AdminAnnouncementsView from './components/admin/AdminAnnouncementsView';
import AdminSupportView from './components/admin/AdminSupportView';
import AdminRedirectsView from './components/admin/AdminRedirectsView';
import AdminPromoCodesView from './components/admin/AdminPromoCodesView';
import AdminContactsView from './components/admin/AdminContactsView';
import AdminSessionsView from './components/admin/AdminSessionsView';
import AdminHeatmapView from './components/admin/AdminHeatmapView';
import AdminTourView from './components/admin/AdminTourView';
import AdminSecurityView from './components/admin/AdminSecurityView';
import AdminStatusView from './components/admin/AdminStatusView';
import type { SystemStatus } from './components/admin/AdminStatusView';
import type { ContactSubmissionRow } from './components/admin/AdminContactsView';
import AnnouncementBar from './components/AnnouncementBar';

const PATH_TO_PAGE: Record<string, AdminPage> = {
  '/admin': 'dashboard',
  '/admin/': 'dashboard',
  '/admin/dashboard': 'dashboard',
  '/admin/plans': 'plans',
  '/admin/users': 'users',
  '/admin/feedback': 'feedback',
  '/admin/audit': 'audit',
  '/admin/announcements': 'announcements',
  '/admin/support': 'support',
  '/admin/redirects': 'redirects',
  '/admin/promos': 'promos',
  '/admin/contacts': 'contacts',
  '/admin/sessions': 'sessions',
  '/admin/heatmaps': 'heatmaps',
  '/admin/tour': 'tour',
  '/admin/security': 'security',
  '/admin/status': 'status',
};
const PAGE_TO_PATH: Record<AdminPage, string> = {
  dashboard: '/admin/dashboard',
  plans: '/admin/plans',
  users: '/admin/users',
  feedback: '/admin/feedback',
  audit: '/admin/audit',
  announcements: '/admin/announcements',
  support: '/admin/support',
  redirects: '/admin/redirects',
  promos: '/admin/promos',
  contacts: '/admin/contacts',
  sessions: '/admin/sessions',
  heatmaps: '/admin/heatmaps',
  tour: '/admin/tour',
  security: '/admin/security',
  status: '/admin/status',
};

const defaultPermissions: AdminPermissions = {
  viewUsers: false,
  manageUsers: false,
  manageRoles: false,
  managePlans: false,
  managePromoCodes: false,
  moderateFeedback: false,
  viewAnalytics: false,
  viewAuditLogs: false,
  manageSupport: false,
  manageAnnouncements: false,
  manageRedirects: false,
  viewSessionReplay: false,
};
const adminFallbackPermissions: AdminPermissions = {
  viewUsers: true,
  manageUsers: true,
  manageRoles: true,
  managePlans: true,
  managePromoCodes: true,
  moderateFeedback: true,
  viewAnalytics: true,
  viewAuditLogs: true,
  manageSupport: true,
  manageAnnouncements: true,
  manageRedirects: true,
  viewSessionReplay: true,
};

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { token, user, logout, permissions, setPermissions, setAdminViewMode } = useAuth();
  const isRtl = i18n.language === 'ar';
  const [users, setUsers] = useState<UserRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [moderationQueue, setModerationQueue] = useState<FeedbackRow[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMeetings: 0,
    totalMinutes: 0,
    pendingFeedback: 0,
    mrr: 0,
    monthlyCost: 0,
    monthlyProfit: 0,
    marginPct: 0,
    planCostBreakdown: {
      starterCost: 0,
      proCost: 0,
    },
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userDetailId, setUserDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activePage, setActivePage] = useState<AdminPage>(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    return PATH_TO_PAGE[path] || PATH_TO_PAGE[path.replace(/\/$/, '') || path] || 'dashboard';
  });
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>({
    users: false,
    plans: false,
    feedback: false,
    moderation: false,
    stats: false,
    analytics: false,
    permissions: false,
    audit: false,
    announcements: false,
    support: false,
    redirects: false,
    promos: false,
    contacts: false,
  });
  const [sectionError, setSectionError] = useState<Record<string, string | null>>({
    users: null,
    plans: null,
    feedback: null,
    moderation: null,
    stats: null,
    analytics: null,
    permissions: null,
    audit: null,
    announcements: null,
    support: null,
    redirects: null,
    promos: null,
    contacts: null,
  });

  const [supportConversations, setSupportConversations] = useState<{ id: string; user_email: string; last_message: string | null; status: string; assigned_to: string | null; assigned_email: string | null; updated_at: string }[]>([]);
  const [supportStatusFilter, setSupportStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [supportTagFilter, setSupportTagFilter] = useState('');
  const [supportSearchInput, setSupportSearchInput] = useState('');
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  const supportSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [supportAdmins, setSupportAdmins] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [supportConvMenuOpen, setSupportConvMenuOpen] = useState(false);
  const supportConvMenuRef = useRef<HTMLDivElement>(null);
  const [selectedSupportConv, setSelectedSupportConv] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<{ id: string; sender_type: string; sender_id: string; content: string; attachments?: string[]; created_at: string }[]>([]);
  const [supportConvDetail, setSupportConvDetail] = useState<{ user_email: string; status?: string; assigned_to?: string | null; assigned_email?: string | null; admin_notes?: string | null; tags?: string | null } | null>(null);
  const [supportConvLoading, setSupportConvLoading] = useState(false);
  const [supportPendingAttachments, setSupportPendingAttachments] = useState<{ url: string; filename?: string }[]>([]);
  const [showSupportEmojiPicker, setShowSupportEmojiPicker] = useState(false);
  const [supportUserTyping, setSupportUserTyping] = useState(false);
  const [supportUserOnline, setSupportUserOnline] = useState(false);
  const supportFileInputRef = useRef<HTMLInputElement>(null);
  const supportInputRef = useRef<HTMLInputElement>(null);
  const supportEmojiPickerRef = useRef<HTMLDivElement>(null);
  const supportTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [supportInput, setSupportInput] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const supportSocketRef = useRef<any>(null);
  const supportMessagesEndRef = useRef<HTMLDivElement | null>(null);

  const navigateToPage = (page: AdminPage) => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
    const path = PAGE_TO_PATH[page];
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({ adminPage: page }, '', path);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    const page = PATH_TO_PAGE[path] || PATH_TO_PAGE[path.replace(/\/$/, '')];
    if (page) setActivePage(page);
  }, []);

  useEffect(() => {
    if (isDesktop) setIsMobileMenuOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const page = PATH_TO_PAGE[path] || PATH_TO_PAGE[path.replace(/\/$/, '')];
      if (page) setActivePage(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [userPage, setUserPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const userPageSize = 8;
  const feedbackPageSize = 8;

  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('');
  const [feedbackFrom, setFeedbackFrom] = useState('');
  const [feedbackTo, setFeedbackTo] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'ban' | 'unban' | 'setRole' | 'setPlan'>('ban');
  const [bulkRole, setBulkRole] = useState<'user' | 'admin'>('user');
  const [bulkPlanId, setBulkPlanId] = useState('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [exportUsersLoading, setExportUsersLoading] = useState(false);

  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planEstimateFeatures, setPlanEstimateFeatures] = useState({ videoCaption: false, cloudSave: false, unlimitedTranslations: false });
  const [planAiPrompt, setPlanAiPrompt] = useState('');
  const [planAiLoading, setPlanAiLoading] = useState(false);
  const [planEstimate, setPlanEstimate] = useState<{ estimatedCostPerUserMonth: number; suggestedPriceMin: number; suggestedPriceMax: number } | null>(null);
  const planEstimateLoadingRef = useRef(false);
  const planEstimateDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const planValidationError = useMemo(() => {
    if (!editingPlan?.isNew || !editingPlan?.id) return null;
    const id = editingPlan.id.trim();
    if (!/^[a-z0-9-]+$/.test(id)) return t('admin.planValidationLowercase');
    if (plans.some((p) => p.id === id)) return t('admin.planIdExists');
    return null;
  }, [editingPlan?.isNew, editingPlan?.id, plans, t]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: '', password: '', name: '', plan_id: 'starter' });
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [usageOverrideValue, setUsageOverrideValue] = useState<number>(0);
  const [usageOverrideSaving, setUsageOverrideSaving] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const auditPageSize = 20;
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditAdminFilter, setAuditAdminFilter] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [auditAdmins, setAuditAdmins] = useState<{ admin_id: string; admin_email: string }[]>([]);
  const [exportAuditLoading, setExportAuditLoading] = useState(false);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [redirects, setRedirects] = useState<{ id: string; from_path: string; to_path: string; active: number }[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<{ id: string; from_path: string; to_path: string; active: number; isNew?: boolean } | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [availablePages, setAvailablePages] = useState<{ path: string; label: string }[]>([]);
  const [promos, setPromos] = useState<{ id: string; code: string; type: 'discount' | 'plan_time'; discount_percent?: number | null; plan_id?: string | null; plan_months?: number | null; valid_from?: string | null; valid_until?: string | null; max_uses?: number | null; max_uses_per_user?: number | null; uses_count?: number; active: number }[]>([]);
  const [editingPromo, setEditingPromo] = useState<{ id: string; code: string; type: 'discount' | 'plan_time'; discount_percent?: number | null; plan_id?: string | null; plan_months?: number | null; valid_from?: string | null; valid_until?: string | null; max_uses?: number | null; max_uses_per_user?: number | null; active?: number; isNew?: boolean } | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);

  const [contacts, setContacts] = useState<ContactSubmissionRow[]>([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotal, setContactTotal] = useState(0);
  const contactPageSize = 20;
  const [contactFrom, setContactFrom] = useState('');
  const [contactTo, setContactTo] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const contactSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [securityBlockedIPs, setSecurityBlockedIPs] = useState<any[]>([]);
  const [securityPage, setSecurityPage] = useState(1);
  const [securityTotal, setSecurityTotal] = useState(0);
  const securityPageSize = 30;
  const [securityTypeFilter, setSecurityTypeFilter] = useState('');
  const [securityIPFilter, setSecurityIPFilter] = useState('');
  const [securityFrom, setSecurityFrom] = useState('');
  const [securityTo, setSecurityTo] = useState('');

  const [fullSystemStatus, setFullSystemStatus] = useState<SystemStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusLastUpdated, setStatusLastUpdated] = useState<number | null>(null);

  const [analyticsDays, setAnalyticsDays] = useState(14);

  const currentPermissions = permissions || (user?.role === 'admin' ? adminFallbackPermissions : defaultPermissions);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const setLoading = (key: string, value: boolean) => {
    setSectionLoading((prev) => ({ ...prev, [key]: value }));
  };

  const setError = (key: string, value: string | null) => {
    setSectionError((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = formatCurrencyUtil;

  const apiRequest = async (url: string, init?: RequestInit) => {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err: any) {
      throw new Error(err?.message || 'Network error');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || data.message || (res.status === 401 ? 'Unauthorized' : res.status === 403 ? 'Forbidden' : res.status === 404 ? (data.conversationId ? `Conversation not found (ID: ${data.conversationId})` : 'Not found') : `Request failed (${res.status})`);
      throw new Error(msg);
    }
    return data;
  };

  const loadPermissions = async () => {
    setLoading('permissions', true);
    setError('permissions', null);
    try {
      const data = await apiRequest('/api/admin/permissions', { headers });
      setPermissions(data.permissions || null);
    } catch (err: any) {
      setError('permissions', err.message);
    } finally {
      setLoading('permissions', false);
    }
  };

  const loadStats = async () => {
    setLoading('stats', true);
    setError('stats', null);
    try {
      const data = await apiRequest('/api/admin/stats', { headers });
      setStats(data);
    } catch (err: any) {
      setError('stats', err.message);
    } finally {
      setLoading('stats', false);
    }
  };

  const loadPlans = async () => {
    setLoading('plans', true);
    setError('plans', null);
    try {
      const data = await apiRequest('/api/admin/plans', { headers });
      setPlans(data);
    } catch (err: any) {
      setError('plans', err.message);
    } finally {
      setLoading('plans', false);
    }
  };

  const loadUsers = async () => {
    setLoading('users', true);
    setError('users', null);
    try {
      const qs = new URLSearchParams({
        page: String(userPage),
        pageSize: String(userPageSize),
      });
      if (userQuery) qs.set('q', userQuery);
      if (roleFilter) qs.set('role', roleFilter);
      if (statusFilter) qs.set('status', statusFilter);
      if (planFilter) qs.set('plan', planFilter);
      const data = await apiRequest(`/api/admin/users?${qs.toString()}`, { headers });
      const items = Array.isArray(data) ? data : data.items || [];
      setUsers(items);
      setUsersTotal(Array.isArray(data) ? items.length : data.total || 0);
      setSelectedUserIds((prev) => prev.filter((id) => items.some((u: UserRow) => u.id === id)));
    } catch (err: any) {
      setError('users', err.message);
    } finally {
      setLoading('users', false);
    }
  };

  const loadFeedback = async () => {
    setLoading('feedback', true);
    setError('feedback', null);
    try {
      const qs = new URLSearchParams({
        page: String(feedbackPage),
        pageSize: String(feedbackPageSize),
      });
      if (feedbackStatus) qs.set('status', feedbackStatus);
      if (feedbackRating) qs.set('rating', feedbackRating);
      if (feedbackFrom) qs.set('from', feedbackFrom);
      if (feedbackTo) qs.set('to', feedbackTo);
      const data = await apiRequest(`/api/admin/feedback?${qs.toString()}`, { headers });
      const items = Array.isArray(data) ? data : data.items || [];
      setFeedback(items);
      setFeedbackTotal(Array.isArray(data) ? items.length : data.total || 0);
    } catch (err: any) {
      setError('feedback', err.message);
    } finally {
      setLoading('feedback', false);
    }
  };

  const loadModerationQueue = async () => {
    setLoading('moderation', true);
    setError('moderation', null);
    try {
      const data = await apiRequest('/api/admin/moderation/queue?status=pending', { headers });
      setModerationQueue(data.items || []);
    } catch (err: any) {
      setError('moderation', err.message);
    } finally {
      setLoading('moderation', false);
    }
  };

  const loadAnalytics = async (days = 14) => {
    setLoading('analytics', true);
    setError('analytics', null);
    try {
      const data = await apiRequest(`/api/admin/analytics?days=${days}`, { headers });
      setAnalytics(data);
    } catch (err: any) {
      setError('analytics', err.message);
    } finally {
      setLoading('analytics', false);
    }
  };

  const loadAuditLogs = async (page = auditPage) => {
    setLoading('audit', true);
    setError('audit', null);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(auditPageSize) });
      if (auditActionFilter) qs.set('action', auditActionFilter);
      if (auditAdminFilter) qs.set('admin_id', auditAdminFilter);
      if (auditFrom) qs.set('from', auditFrom);
      if (auditTo) qs.set('to', auditTo);
      const data = await apiRequest(`/api/admin/audit-logs?${qs.toString()}`, { headers });
      setAuditLogs(data.items || []);
      setAuditTotal(data.total || 0);
    } catch (err: any) {
      setError('audit', err.message);
    } finally {
      setLoading('audit', false);
    }
  };

  const loadSecurityEvents = async (page = securityPage) => {
    setLoading('securityEvents', true);
    setError('securityEvents', null);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(securityPageSize) });
      if (securityTypeFilter) qs.set('type', securityTypeFilter);
      if (securityIPFilter) qs.set('ip', securityIPFilter);
      if (securityFrom) qs.set('fromDate', securityFrom);
      if (securityTo) qs.set('toDate', securityTo);
      const data = await apiRequest(`/api/admin/security/events?${qs.toString()}`, { headers });
      setSecurityEvents(data.events || []);
      setSecurityTotal(data.total || 0);
    } catch (err: any) {
      setError('securityEvents', err.message);
    } finally {
      setLoading('securityEvents', false);
    }
  };

  const loadSecurityStats = async () => {
    setLoading('securityStats', true);
    try {
      const data = await apiRequest('/api/admin/security/stats', { headers });
      setSecurityStats(data);
    } catch {
      setSecurityStats(null);
    } finally {
      setLoading('securityStats', false);
    }
  };

  const loadSecurityBlockedIPs = async () => {
    setLoading('securityBlockedIPs', true);
    try {
      const data = await apiRequest('/api/admin/security/blocked-ips', { headers });
      setSecurityBlockedIPs(data.blockedIPs || []);
    } catch {
      setSecurityBlockedIPs([]);
    } finally {
      setLoading('securityBlockedIPs', false);
    }
  };

  const handleBlockIP = async (ip: string, reason: string) => {
    await apiRequest('/api/admin/security/block-ip', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ip, reason }),
    });
    await loadSecurityBlockedIPs();
    await loadSecurityStats();
  };

  const handleUnblockIP = async (ip: string) => {
    await apiRequest(`/api/admin/security/block-ip/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
      headers,
    });
    await loadSecurityBlockedIPs();
    await loadSecurityStats();
  };

  const loadSystemStatus = async () => {
    try {
      const data = await apiRequest('/api/admin/status', { headers });
      setFullSystemStatus(data);
      setStatusLastUpdated(Date.now());
    } catch {
      setFullSystemStatus(null);
    }
  };

  const loadFullStatus = async () => {
    setStatusLoading(true);
    try {
      const data = await apiRequest('/api/admin/status', { headers });
      setFullSystemStatus(data);
      setStatusLastUpdated(Date.now());
    } catch {
      // keep existing data on refresh failure
    } finally {
      setStatusLoading(false);
    }
  };

  const handleExportAuditCSV = async () => {
    setExportAuditLoading(true);
    try {
      const all: any[] = [];
      let page = 1;
      let total = 0;
      do {
        const qs = new URLSearchParams({ page: String(page), pageSize: '100' });
        if (auditActionFilter) qs.set('action', auditActionFilter);
        if (auditAdminFilter) qs.set('admin_id', auditAdminFilter);
        if (auditFrom) qs.set('from', auditFrom);
        if (auditTo) qs.set('to', auditTo);
        const data = await apiRequest(`/api/admin/audit-logs?${qs.toString()}`, { headers });
        const items = data.items || [];
        total = data.total || 0;
        all.push(...items);
        page++;
      } while (all.length < total && page <= 50);
      const csvHeaders = ['id', 'admin_id', 'admin_email', 'action', 'target_user_id', 'metadata_json', 'created_at'];
      const csv = [csvHeaders.join(','), ...all.map((r) => csvHeaders.map((h) => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify(t('admin.auditExported'));
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setExportAuditLoading(false);
    }
  };

  const handleExportAuditJSON = async () => {
    setExportAuditLoading(true);
    try {
      const all: any[] = [];
      let page = 1;
      let total = 0;
      do {
        const qs = new URLSearchParams({ page: String(page), pageSize: '100' });
        if (auditActionFilter) qs.set('action', auditActionFilter);
        if (auditAdminFilter) qs.set('admin_id', auditAdminFilter);
        if (auditFrom) qs.set('from', auditFrom);
        if (auditTo) qs.set('to', auditTo);
        const data = await apiRequest(`/api/admin/audit-logs?${qs.toString()}`, { headers });
        const items = data.items || [];
        total = data.total || 0;
        all.push(...items);
        page++;
      } while (all.length < total && page <= 50);
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify(t('admin.auditExported'));
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setExportAuditLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    setLoading('announcements', true);
    setError('announcements', null);
    try {
      const data = await apiRequest('/api/admin/announcements', { headers });
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('announcements', err.message);
    } finally {
      setLoading('announcements', false);
    }
  };

  const loadSupportConversations = async () => {
    setLoading('support', true);
    setError('support', null);
    try {
      const params = new URLSearchParams();
      if (supportStatusFilter !== 'all') params.set('status', supportStatusFilter);
      if (supportSearchQuery.trim()) params.set('q', supportSearchQuery.trim());
      if (supportTagFilter.trim()) params.set('tag', supportTagFilter.trim());
      const data = await apiRequest(`/api/admin/support/conversations${params.toString() ? '?' + params : ''}`, { headers });
      setSupportConversations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('support', err.message);
    } finally {
      setLoading('support', false);
    }
  };

  const handleExportSupportConversation = (format: 'json' | 'txt') => {
    if (!selectedSupportConv || !supportConvDetail) return;
    const exportData = {
      conversationId: selectedSupportConv,
      user_email: supportConvDetail.user_email,
      status: supportConvDetail.status,
      assigned_to: supportConvDetail.assigned_email,
      exported_at: new Date().toISOString(),
      messages: supportMessages.map((m) => ({
        sender: m.sender_type === 'admin' ? 'admin' : 'user',
        content: m.content,
        attachments: m.attachments,
        created_at: m.created_at,
      })),
    };
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `support-${selectedSupportConv}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const lines = [
        `Support Conversation Export`,
        `User: ${supportConvDetail.user_email}`,
        `Status: ${supportConvDetail.status}`,
        `Exported: ${new Date().toLocaleString()}`,
        ``,
        `--- Messages ---`,
        ...supportMessages.map((m) => {
          const sender = m.sender_type === 'admin' ? 'Admin' : supportConvDetail.user_email;
          const time = new Date(m.created_at).toLocaleString();
          return `[${time}] ${sender}:\n${m.content}${(m.attachments?.length ?? 0) > 0 ? '\nAttachments: ' + m.attachments!.join(', ') : ''}`;
        }),
      ];
      const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `support-${selectedSupportConv}-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    notify(t('admin.conversationExported'));
  };

  const loadSupportAdmins = async () => {
    try {
      const data = await apiRequest('/api/admin/support/admins', { headers });
      setSupportAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load admins', err);
    }
  };

  const updateSupportConversation = async (convId: string, updates: { status?: 'open' | 'closed'; assigned_to?: string | null; admin_notes?: string | null; tags?: string | null }) => {
    try {
      const updated = await apiRequest(`/api/admin/support/conversations/${convId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      setSupportConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, status: updated.status ?? c.status, assigned_to: updated.assigned_to ?? c.assigned_to, assigned_email: updated.assigned_email ?? c.assigned_email, admin_notes: updated.admin_notes, tags: updated.tags } : c))
      );
      if (selectedSupportConv === convId && supportConvDetail) {
        setSupportConvDetail((prev) => (prev ? { ...prev, status: updated.status, assigned_to: updated.assigned_to, assigned_email: updated.assigned_email, admin_notes: updated.admin_notes, tags: updated.tags } : null));
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const loadSupportConversation = async (convId: string) => {
    setSupportConvLoading(true);
    try {
      const data = await apiRequest(`/api/admin/support/conversations/${convId}`, { headers });
      setSupportMessages(data.messages || []);
      setSupportConvDetail({
        user_email: data.user_email || '',
        status: data.status,
        assigned_to: data.assigned_to ?? null,
        assigned_email: data.assigned_email ?? null,
        admin_notes: data.admin_notes ?? null,
        tags: data.tags ?? null,
      });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSupportConvLoading(false);
    }
  };

  const emitSupportTyping = (isTyping: boolean) => {
    const sock = supportSocketRef.current;
    if (!selectedSupportConv || !sock?.connected) return;
    sock.emit(isTyping ? 'typing_start' : 'typing_stop', { conversationId: selectedSupportConv });
  };

  const handleSupportInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSupportInput(e.target.value);
    emitSupportTyping(true);
    if (supportTypingTimeoutRef.current) clearTimeout(supportTypingTimeoutRef.current);
    supportTypingTimeoutRef.current = setTimeout(() => {
      emitSupportTyping(false);
      supportTypingTimeoutRef.current = null;
    }, 300);
  };

  const uploadSupportFile = async (file: File): Promise<{ url: string; filename?: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
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

  const sendSupportReply = async () => {
    const content = supportInput.trim();
    const hasAttachments = supportPendingAttachments.length > 0;
    if ((!content && !hasAttachments) || !selectedSupportConv || supportSending) return;
    setSupportSending(true);
    try {
      const data = await apiRequest(`/api/admin/support/conversations/${selectedSupportConv}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: content || ' ',
          attachments: hasAttachments ? supportPendingAttachments.map((a) => a.url) : undefined,
        }),
      });
      setSupportMessages((prev) => [...prev, data.message]);
      setSupportInput('');
      setSupportPendingAttachments([]);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSupportSending(false);
    }
  };

  const loadAuditFilters = async () => {
    try {
      const [actionsRes, adminsRes] = await Promise.all([
        apiRequest('/api/admin/audit-logs/actions', { headers }),
        apiRequest('/api/admin/audit-logs/admins', { headers }),
      ]);
      setAuditActions(Array.isArray(actionsRes) ? actionsRes : []);
      setAuditAdmins(Array.isArray(adminsRes) ? adminsRes : []);
    } catch (_) {}
  };

  const loadUserDetail = async (id: string) => {
    setUserDetailId(id);
    try {
      const data = await apiRequest(`/api/admin/users/${id}`, { headers });
      setUserDetail(data);
      setUsageOverrideValue(Number(data.user?.extra_minutes_override ?? 0) || 0);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
      setUserDetailId(null);
    }
  };

  const handleRevokeSessions = async () => {
    if (!userDetailId || userDetailId === 'admin-1') return;
    if (!confirmAction(t('admin.revokeSessions'))) return;
    try {
      await apiRequest(`/api/admin/users/${userDetailId}/revoke-sessions`, { method: 'POST', headers });
      notify(t('admin.sessionsRevoked'));
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleUsageOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDetailId) return;
    setUsageOverrideSaving(true);
    try {
      await apiRequest(`/api/admin/users/${userDetailId}/usage-override`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ extraMinutes: usageOverrideValue }),
      });
      notify(t('admin.usageOverrideSaved'));
      loadUserDetail(userDetailId);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setUsageOverrideSaving(false);
    }
  };

  useEffect(() => {
    if (!showSupportEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (supportEmojiPickerRef.current && !supportEmojiPickerRef.current.contains(e.target as Node)) {
        setShowSupportEmojiPicker(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showSupportEmojiPicker]);

  useEffect(() => {
    if (!token) return;
    loadPermissions();
    loadPlans();
    loadStats();
    loadFeedback();
    loadModerationQueue();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadAnalytics(analyticsDays);
  }, [token, analyticsDays]);

  useEffect(() => {
    if (!token) return;
    loadUsers();
  }, [token, userPage, userQuery, roleFilter, statusFilter, planFilter]);

  useEffect(() => {
    if (!token) return;
    loadFeedback();
  }, [token, feedbackPage, feedbackStatus, feedbackRating, feedbackFrom, feedbackTo]);

  useEffect(() => {
    if (!token || !currentPermissions.viewAuditLogs || activePage !== 'audit') return;
    loadAuditFilters();
  }, [token, activePage, currentPermissions.viewAuditLogs]);

  useEffect(() => {
    if (!token || activePage !== 'announcements') return;
    loadAnnouncements();
  }, [token, activePage]);

  const loadRedirects = async () => {
    if (!token || !currentPermissions.manageRedirects) return;
    setLoading('redirects', true);
    setError('redirects', null);
    try {
      const data = await apiRequest('/api/admin/redirects', { headers });
      setRedirects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('redirects', err.message);
    } finally {
      setLoading('redirects', false);
    }
  };

  useEffect(() => {
    if (!token || activePage !== 'redirects' || !currentPermissions.manageRedirects) return;
    loadRedirects();
  }, [token, activePage, currentPermissions.manageRedirects]);

  const loadPromos = async () => {
    if (!token || !currentPermissions.managePromoCodes) return;
    setLoading('promos', true);
    setError('promos', null);
    try {
      const data = await apiRequest('/api/admin/promos', { headers });
      setPromos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('promos', err.message);
    } finally {
      setLoading('promos', false);
    }
  };

  useEffect(() => {
    if (!token || activePage !== 'promos' || !currentPermissions.managePromoCodes) return;
    loadPromos();
  }, [token, activePage, currentPermissions.managePromoCodes]);

  const loadContacts = async (page = contactPage) => {
    if (!token || !currentPermissions.manageSupport) return;
    setLoading('contacts', true);
    setError('contacts', null);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(contactPageSize) });
      if (contactFrom) qs.set('from', contactFrom);
      if (contactTo) qs.set('to', contactTo);
      if (contactSearchQuery) qs.set('search', contactSearchQuery);
      const data = await apiRequest(`/api/admin/contact-submissions?${qs.toString()}`, { headers });
      setContacts(Array.isArray(data.items) ? data.items : []);
      setContactTotal(Math.max(0, Number(data.total) || 0));
    } catch (err: any) {
      setError('contacts', err.message);
    } finally {
      setLoading('contacts', false);
    }
  };

  useEffect(() => {
    if (contactSearchTimeoutRef.current) clearTimeout(contactSearchTimeoutRef.current);
    contactSearchTimeoutRef.current = setTimeout(() => {
      setContactSearchQuery(contactSearch.trim());
      contactSearchTimeoutRef.current = null;
    }, 400);
    return () => {
      if (contactSearchTimeoutRef.current) clearTimeout(contactSearchTimeoutRef.current);
    };
  }, [contactSearch]);

  useEffect(() => {
    if (!token || activePage !== 'contacts' || !currentPermissions.manageSupport) return;
    loadContacts();
  }, [token, activePage, currentPermissions.manageSupport, contactPage, contactFrom, contactTo, contactSearchQuery]);

  useEffect(() => {
    if (!token || activePage !== 'support' || !currentPermissions.manageSupport) return;
    loadSupportConversations();
  }, [token, activePage, currentPermissions.manageSupport, supportStatusFilter, supportSearchQuery, supportTagFilter]);

  useEffect(() => {
    if (activePage === 'support' && currentPermissions.manageSupport) loadSupportAdmins();
  }, [activePage, currentPermissions.manageSupport, token]);

  useEffect(() => {
    if (!supportConvMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (supportConvMenuRef.current && !supportConvMenuRef.current.contains(e.target as Node)) {
        setSupportConvMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [supportConvMenuOpen]);

  useEffect(() => {
    if (supportSearchTimeoutRef.current) clearTimeout(supportSearchTimeoutRef.current);
    supportSearchTimeoutRef.current = setTimeout(() => {
      setSupportSearchQuery(supportSearchInput.trim());
      supportSearchTimeoutRef.current = null;
    }, 400);
    return () => {
      if (supportSearchTimeoutRef.current) clearTimeout(supportSearchTimeoutRef.current);
    };
  }, [supportSearchInput]);

  useEffect(() => {
    if (activePage !== 'support') {
      setSelectedSupportConv(null);
      setSupportMessages([]);
      setSupportConvDetail(null);
    }
  }, [activePage]);

  useEffect(() => {
    if (!selectedSupportConv || !token) return;
    setSupportUserTyping(false);
    setSupportUserOnline(false);
    loadSupportConversation(selectedSupportConv);
    let socket: any = null;
    socket = io(window.location.origin, { auth: { token } });
    supportSocketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join_conversation', { conversationId: selectedSupportConv, type: 'admin' });
    });
    socket.on('new_message', (msg: { id: string; sender_type: string; sender_id: string; content: string; attachments?: string[]; created_at: string }) => {
      if (msg.sender_type === 'admin' && msg.sender_id === user?.id) return;
      setSupportMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on('typing_start', (data: { type?: string }) => {
      if (data?.type === 'user') setSupportUserTyping(true);
    });
    socket.on('typing_stop', (data: { type?: string }) => {
      if (data?.type === 'user') setSupportUserTyping(false);
    });
    socket.on('presence', (data: { type?: string; online?: boolean }) => {
      if (data?.type === 'user') setSupportUserOnline(!!data.online);
    });
    return () => {
      if (socket) socket.disconnect();
      supportSocketRef.current = null;
      if (supportTypingTimeoutRef.current) clearTimeout(supportTypingTimeoutRef.current);
    };
  }, [selectedSupportConv, token, user?.id]);

  useEffect(() => {
    supportMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages]);

  useEffect(() => {
    if (!token || activePage !== 'dashboard' || !currentPermissions.viewAnalytics) return;
    loadSystemStatus();
  }, [token, activePage, currentPermissions.viewAnalytics]);

  useEffect(() => {
    if (!token || !currentPermissions.viewAuditLogs || activePage !== 'audit') return;
    loadAuditLogs(auditPage);
  }, [token, activePage, auditPage, auditActionFilter, auditAdminFilter, auditFrom, auditTo, currentPermissions.viewAuditLogs]);

  useEffect(() => {
    if (!token || !currentPermissions.viewAuditLogs || activePage !== 'security') return;
    loadSecurityStats();
    loadSecurityBlockedIPs();
  }, [token, activePage, currentPermissions.viewAuditLogs]);

  useEffect(() => {
    if (!token || !currentPermissions.viewAuditLogs || activePage !== 'security') return;
    loadSecurityEvents(securityPage);
  }, [token, activePage, securityPage, securityTypeFilter, securityIPFilter, securityFrom, securityTo, currentPermissions.viewAuditLogs]);

  useEffect(() => {
    if (!token || !currentPermissions.viewAnalytics || activePage !== 'status') return;
    loadFullStatus();
    const interval = setInterval(loadFullStatus, 30000);
    return () => clearInterval(interval);
  }, [token, activePage, currentPermissions.viewAnalytics]);

  const refreshAdminData = () => {
    loadUsers();
    loadStats();
    loadFeedback();
    loadModerationQueue();
    loadAnalytics();
  };

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  const confirmAction = (message: string) => window.confirm(message);

  const handleBan = async (id: string, isBanned: boolean) => {
    if (!confirmAction(isBanned ? t('admin.unbanUserConfirm') : t('admin.banUserConfirm'))) return;
    try {
      await apiRequest(`/api/admin/users/${id}/${isBanned ? 'unban' : 'ban'}`, { method: 'POST', headers });
      notify(isBanned ? t('admin.userUnbanned') : t('admin.userBanned'));
      refreshAdminData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    if (!confirmAction(t('admin.changeRoleConfirm', { role }))) return;
    try {
      await apiRequest(`/api/admin/users/${id}/role`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role }),
      });
      notify(t('admin.roleUpdated'));
      refreshAdminData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleUserPlanChange = async (id: string, plan_id: string) => {
    if (!confirmAction(t('admin.assignPlanConfirm', { plan: plan_id }))) return;
    try {
      await apiRequest(`/api/admin/users/${id}/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan_id }),
      });
      notify(t('admin.planUpdated'));
      refreshAdminData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planValidationError) return;
    try {
      const method = editingPlan.isNew ? 'POST' : 'PUT';
      const url = editingPlan.isNew ? '/api/admin/plans' : `/api/admin/plans/${editingPlan.id}`;
      const basePayload = {
        name: editingPlan.name,
        price: editingPlan.price,
        minutes_limit: editingPlan.minutes_limit,
        language_changes_limit: editingPlan.language_changes_limit ?? -1,
        video_caption: !!(editingPlan.video_caption === true || editingPlan.video_caption === 1),
        cloud_save: !!(editingPlan.cloud_save === true || editingPlan.cloud_save === 1),
        pro_analysis_enabled: !!(editingPlan.pro_analysis_enabled === true || editingPlan.pro_analysis_enabled === 1),
        analysis_model: editingPlan.analysis_model || 'gemini-2.5-flash',
        transcript_model: editingPlan.transcript_model || 'gemini-2.5-flash',
        soft_limit_percent: editingPlan.soft_limit_percent ?? 100,
        hard_limit_percent: editingPlan.hard_limit_percent ?? 100,
      };
      const payload = editingPlan.isNew ? { ...basePayload, id: editingPlan.id } : basePayload;
      await apiRequest(url, { method, headers, body: JSON.stringify(payload) });
      setShowPlanModal(false);
      notify(t('admin.planSaved'));
      loadPlans();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    try {
      await apiRequest(`/api/admin/plans/${plan.id}`, { method: 'DELETE', headers });
      notify(t('admin.planDeleted'));
      loadPlans();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDuplicatePlan = (plan: Plan) => {
    const baseId = plan.id + '-copy';
    let newId = baseId;
    let i = 1;
    while (plans.some((p) => p.id === newId)) {
      newId = `${baseId}-${i}`;
      i++;
    }
    setEditingPlan({
      id: newId,
      name: plan.name + ' (Copy)',
      price: Math.round((plan.price + 5) * 100) / 100,
      minutes_limit: Math.round(plan.minutes_limit * 1.2),
      language_changes_limit: plan.language_changes_limit ?? -1,
      video_caption: plan.video_caption,
      cloud_save: plan.cloud_save,
      pro_analysis_enabled: plan.pro_analysis_enabled,
      analysis_model: plan.analysis_model || 'gemini-2.5-flash',
      transcript_model: plan.transcript_model || 'gemini-2.5-flash',
      soft_limit_percent: plan.soft_limit_percent ?? 100,
      hard_limit_percent: plan.hard_limit_percent ?? 100,
      isNew: true,
    });
    setShowPlanModal(true);
  };

  const fetchPlanEstimate = useCallback(async () => {
    if (!editingPlan || !showPlanModal || planEstimateLoadingRef.current) return;
    planEstimateLoadingRef.current = true;
    setPlanEstimate(null);
    try {
      const data = await apiRequest('/api/admin/plans/estimate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          minutes_limit: editingPlan.minutes_limit ?? 0,
          videoCaption: planEstimateFeatures.videoCaption,
          cloudSave: planEstimateFeatures.cloudSave,
          unlimitedTranslations: planEstimateFeatures.unlimitedTranslations,
        }),
      });
      setPlanEstimate(data);
    } catch {
      setPlanEstimate(null);
    } finally {
      planEstimateLoadingRef.current = false;
    }
  }, [editingPlan, showPlanModal, planEstimateFeatures, headers]);

  useEffect(() => {
    if (!showPlanModal || !editingPlan) {
      setPlanEstimate(null);
      return;
    }
    if (planEstimateDebounceRef.current) clearTimeout(planEstimateDebounceRef.current);
    planEstimateDebounceRef.current = setTimeout(() => {
      planEstimateDebounceRef.current = null;
      fetchPlanEstimate();
    }, 300);
    return () => {
      if (planEstimateDebounceRef.current) clearTimeout(planEstimateDebounceRef.current);
    };
  }, [showPlanModal, editingPlan?.minutes_limit, planEstimateFeatures, fetchPlanEstimate]);

  useEffect(() => {
    if (!showPlanModal) setPlanAiPrompt('');
  }, [showPlanModal]);

  const handleApplySuggestedPrice = useCallback(() => {
    if (!planEstimate || !editingPlan) return;
    const mid = Math.round((planEstimate.suggestedPriceMin + planEstimate.suggestedPriceMax) / 2);
    setEditingPlan({ ...editingPlan, price: mid });
  }, [planEstimate, editingPlan]);

  const handleGeneratePlanWithAI = useCallback(async () => {
    if (!planAiPrompt.trim() || planAiLoading || !editingPlan?.isNew) return;
    setPlanAiLoading(true);
    try {
      const data = await apiRequest('/api/admin/generate-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: planAiPrompt.trim() }),
      });
      setEditingPlan({
        id: data.id,
        name: data.name,
        price: data.price,
        minutes_limit: data.minutes_limit,
        language_changes_limit: data.language_changes_limit ?? -1,
        video_caption: data.video_caption,
        cloud_save: data.cloud_save,
        pro_analysis_enabled: data.pro_analysis_enabled,
        transcript_model: data.transcript_model || 'gemini-2.5-flash',
        analysis_model: data.analysis_model || 'gemini-2.5-flash',
        isNew: true,
      });
      setPlanEstimateFeatures({
        videoCaption: !!data.video_caption,
        cloudSave: !!data.cloud_save,
        unlimitedTranslations: (data.language_changes_limit ?? -1) === -1,
      });
      notify(t('admin.planGenerated'));
    } catch (err: any) {
      notify(err.message || t('admin.planGenerateFailed'), 'error');
    } finally {
      setPlanAiLoading(false);
    }
  }, [planAiPrompt, planAiLoading, editingPlan?.isNew, headers, t]);

  const reviewFeedback = async (id: string, decision: 'accepted' | 'rejected') => {
    try {
      await apiRequest(`/api/admin/moderation/${id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ decision, notes: moderationNotes[id] || '' }),
      });
      notify(decision === 'accepted' ? t('admin.feedbackAccepted') : t('admin.feedbackRejected'));
      loadFeedback();
      loadModerationQueue();
      loadStats();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    try {
      const showOn = Array.isArray(editingAnnouncement.show_on) && editingAnnouncement.show_on.length > 0
        ? editingAnnouncement.show_on
        : ['public', 'user_app', 'admin_app'];
      const payload = {
        message: String(editingAnnouncement.message || '').trim() || undefined,
        active: !!editingAnnouncement.active,
        priority: editingAnnouncement.priority || 'info',
        starts_at: editingAnnouncement.starts_at?.trim() || null,
        ends_at: editingAnnouncement.ends_at?.trim() || null,
        show_on: showOn,
      };
      if (!payload.message) {
        notify(t('admin.message') + ' is required', 'error');
        return;
      }
      if (editingAnnouncement.isNew) {
        await apiRequest('/api/admin/announcements', { method: 'POST', headers, body: JSON.stringify(payload) });
      } else {
        await apiRequest(`/api/admin/announcements/${editingAnnouncement.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      }
      setShowAnnouncementModal(false);
      notify(t('admin.announcementSaved'));
      loadAnnouncements();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const loadAvailablePages = async () => {
    try {
      const data = await apiRequest('/api/admin/redirects/available-pages', { headers });
      setAvailablePages(Array.isArray(data) ? data : []);
    } catch {
      setAvailablePages([]);
    }
  };

  const handleSaveRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRedirect) return;
    const from_path = String(editingRedirect.from_path || '').trim() || '/';
    const to_path = String(editingRedirect.to_path || '').trim();
    if (!to_path) {
      notify(t('admin.toPath') + ' is required', 'error');
      return;
    }
    try {
      const payload = { from_path, to_path, active: editingRedirect.active ? 1 : 0 };
      if (editingRedirect.isNew) {
        await apiRequest('/api/admin/redirects', { method: 'POST', headers, body: JSON.stringify(payload) });
        notify(t('admin.redirectCreated'));
      } else {
        await apiRequest(`/api/admin/redirects/${editingRedirect.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        notify(t('admin.redirectUpdated'));
      }
      setShowRedirectModal(false);
      loadRedirects();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteRedirect = async (r: { id: string }) => {
    if (!confirm(t('admin.deleteRedirectConfirm'))) return;
    try {
      await apiRequest(`/api/admin/redirects/${r.id}`, { method: 'DELETE', headers });
      notify(t('admin.redirectDeleted'));
      loadRedirects();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleToggleRedirectActive = async (r: { id: string; active: number }) => {
    try {
      await apiRequest(`/api/admin/redirects/${r.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ active: r.active ? 0 : 1 }),
      });
      notify(t('admin.redirectUpdated'));
      loadRedirects();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;
    const code = String(editingPromo.code || '').trim().toUpperCase();
    if (!code) {
      notify(t('admin.promoCode') + ' is required', 'error');
      return;
    }
    if (editingPromo.type === 'plan_time' && !editingPromo.plan_id) {
      notify(t('admin.plan') + ' is required for plan-time promo', 'error');
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        code,
        type: editingPromo.type,
        active: editingPromo.active !== 0,
      };
      if (editingPromo.type === 'discount') {
        payload.discount_percent = editingPromo.discount_percent ?? 0;
      } else {
        payload.plan_id = editingPromo.plan_id || null;
        payload.plan_months = editingPromo.plan_months ?? 1;
      }
      if (editingPromo.valid_from) payload.valid_from = editingPromo.valid_from;
      if (editingPromo.valid_until) payload.valid_until = editingPromo.valid_until;
      if (editingPromo.max_uses != null) payload.max_uses = editingPromo.max_uses;
      if (editingPromo.max_uses_per_user != null) payload.max_uses_per_user = editingPromo.max_uses_per_user;
      if (editingPromo.isNew) {
        await apiRequest('/api/admin/promos', { method: 'POST', headers, body: JSON.stringify(payload) });
        notify(t('admin.promoCreated'));
      } else {
        await apiRequest(`/api/admin/promos/${editingPromo.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        notify(t('admin.promoUpdated'));
      }
      setShowPromoModal(false);
      loadPromos();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeletePromo = async (p: { id: string }) => {
    if (!confirm(t('admin.deletePromoConfirm'))) return;
    try {
      await apiRequest(`/api/admin/promos/${p.id}`, { method: 'DELETE', headers });
      notify(t('admin.promoDeleted'));
      loadPromos();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserForm.email || !createUserForm.password) return;
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: createUserForm.email,
          password: createUserForm.password,
          name: createUserForm.name || undefined,
          plan_id: createUserForm.plan_id || undefined,
        }),
      });
      setShowCreateUserModal(false);
      notify(t('admin.userCreated'));
      loadUsers();
      loadStats();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleBulkAction = () => {
    if (selectedUserIds.length === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleBulkActionConfirm = async () => {
    setBulkConfirmOpen(false);
    try {
      await apiRequest('/api/admin/users/bulk-action', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: bulkAction,
          userIds: selectedUserIds,
          role: bulkAction === 'setRole' ? bulkRole : undefined,
          plan_id: bulkAction === 'setPlan' ? bulkPlanId : undefined,
        }),
      });
      setSelectedUserIds([]);
      notify(t('admin.bulkActionApplied'));
      refreshAdminData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportUsers = async () => {
    setExportUsersLoading(true);
    try {
      const all: UserRow[] = [];
      let page = 1;
      let total = 0;
      do {
        const qs = new URLSearchParams({ page: String(page), pageSize: '100' });
        if (userQuery) qs.set('q', userQuery);
        if (roleFilter) qs.set('role', roleFilter);
        if (statusFilter) qs.set('status', statusFilter);
        if (planFilter) qs.set('plan', planFilter);
        const data = await apiRequest(`/api/admin/users?${qs.toString()}`, { headers });
        const items = data.items || [];
        total = data.total || 0;
        all.push(...items);
        page++;
      } while (all.length < total && page <= 50);
      const csvHeaders = ['id', 'email', 'name', 'role', 'status', 'plan_id'];
      const csv = [csvHeaders.join(','), ...all.map((u) => csvHeaders.map((h) => `"${String((u as any)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify(t('admin.usersExported'));
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setExportUsersLoading(false);
    }
  };

  const userTotalPages = Math.max(1, Math.ceil(usersTotal / userPageSize));
  const feedbackTotalPages = Math.max(1, Math.ceil(feedbackTotal / feedbackPageSize));

  const pageTitle =
    activePage === 'dashboard'
      ? t('admin.dashboard')
      : activePage === 'plans'
      ? t('admin.managePlans')
      : activePage === 'users'
      ? t('admin.manageUsers')
      : activePage === 'feedback'
      ? t('admin.userFeedback')
      : activePage === 'audit'
      ? t('admin.auditLogs')
      : activePage === 'announcements'
      ? t('admin.announcements')
      : activePage === 'support'
      ? t('admin.support')
      : activePage === 'redirects'
      ? t('admin.redirects')
      : activePage === 'promos'
      ? t('admin.promoCodes')
      : activePage === 'contacts'
      ? t('admin.contactInquiries')
      : activePage === 'sessions'
      ? t('admin.sessionReplay')
      : activePage === 'heatmaps'
      ? t('admin.heatmaps')
      : activePage === 'tour'
      ? t('admin.tourAnalytics')
      : activePage === 'security'
      ? t('admin.security')
      : activePage === 'status'
      ? t('admin.systemStatusPage', 'System Status')
      : t('common.admin');

  const sidebarVisible = isDesktop || isMobileMenuOpen;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex">
      <AdminSidebar
        isVisible={sidebarVisible}
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleCollapse={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
        activePage={activePage}
        onNavigate={navigateToPage}
        stats={{ totalUsers: stats.totalUsers, pendingFeedback: stats.pendingFeedback }}
        permissions={currentPermissions}
        t={t}
      />

      {/* Mobile backdrop - tap outside to close sidebar */}
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

      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${isDesktopSidebarCollapsed ? 'md:ms-20' : 'md:ms-64'}`}>
        <div className="sticky top-0 z-20 shrink-0">
          <AnnouncementBar context="admin_app" />
          <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden flex-shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title={isMobileMenuOpen ? t('admin.collapseSidebar') : t('admin.expandSidebar')}
              aria-label={isMobileMenuOpen ? t('admin.collapseSidebar') : t('admin.expandSidebar')}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 truncate">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            <button
              onClick={() => setAdminViewMode('user')}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {t('admin.userView')}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.signOut')}
            </button>
          </div>
        </header>
        </div>

        <main className="px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, x: isRtl ? -100 : 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? -100 : 100 }}
              transition={{ duration: 0.2 }}
              className={`fixed bottom-6 end-6 z-[200] rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
        {sectionError.permissions && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2 text-sm">
            {sectionError.permissions}
          </div>
        )}

        {activePage === 'dashboard' && (
          <AdminDashboardView
            stats={stats}
            analytics={analytics}
            sectionLoading={{ stats: sectionLoading.stats, analytics: sectionLoading.analytics }}
            systemStatus={fullSystemStatus ? { db: fullSystemStatus.db, checks: { geminiConfigured: fullSystemStatus.checks.geminiConfigured, jwtConfigured: fullSystemStatus.checks.jwtConfigured } } : null}
            formatCurrency={formatCurrency}
            analyticsDays={analyticsDays}
            setAnalyticsDays={setAnalyticsDays}
            currentPermissions={currentPermissions}
            onRefresh={refreshAdminData}
            onNavigateToFeedback={() => navigateToPage('feedback')}
            onNavigateToSupport={() => navigateToPage('support')}
          />
        )}

        {activePage === 'plans' && (
          <AdminPlansView
            plans={plans}
            loading={sectionLoading.plans}
            error={sectionError.plans}
            currentPermissions={currentPermissions}
            onNewPlan={() => {
              setEditingPlan({ id: '', name: '', price: 0, minutes_limit: 60, language_changes_limit: -1, video_caption: false, cloud_save: false, pro_analysis_enabled: false, analysis_model: 'gemini-2.5-flash', transcript_model: 'gemini-2.5-flash', soft_limit_percent: 100, hard_limit_percent: 100, isNew: true });
              setShowPlanModal(true);
            }}
            onEditPlan={(p) => {
              setEditingPlan({ ...p, isNew: false });
              setShowPlanModal(true);
            }}
            onDuplicatePlan={handleDuplicatePlan}
            onDeletePlan={handleDeletePlan}
          />
        )}

        {activePage === 'users' && (
          <AdminUsersView
            users={users}
            plans={plans}
            loading={sectionLoading.users}
            error={sectionError.users}
            userPage={userPage}
            userTotalPages={userTotalPages}
            selectedUserIds={selectedUserIds}
            userQuery={userQuery}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            planFilter={planFilter}
            bulkAction={bulkAction}
            bulkRole={bulkRole}
            bulkPlanId={bulkPlanId}
            currentPermissions={currentPermissions}
            onQueryChange={(q) => { setUserQuery(q); setUserPage(1); }}
            onRoleFilterChange={(v) => { setRoleFilter(v); setUserPage(1); }}
            onStatusFilterChange={(v) => { setStatusFilter(v); setUserPage(1); }}
            onPlanFilterChange={(v) => { setPlanFilter(v); setUserPage(1); }}
            onPageChange={setUserPage}
            onSelectAll={(checked) => setSelectedUserIds(checked ? users.map((u) => u.id) : [])}
            onSelectUser={(id, checked) => setSelectedUserIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))}
            onBulkActionChange={setBulkAction}
            onBulkRoleChange={setBulkRole}
            onBulkPlanIdChange={setBulkPlanId}
            onCreateUser={() => { setCreateUserForm({ email: '', password: '', name: '', plan_id: 'starter' }); setShowCreateUserModal(true); }}
            onBulkAction={handleBulkAction}
            onBulkActionConfirm={handleBulkActionConfirm}
            showBulkConfirm={bulkConfirmOpen}
            onBulkConfirmClose={() => setBulkConfirmOpen(false)}
            onExport={handleExportUsers}
            exportLoading={exportUsersLoading}
            onLoadUserDetail={loadUserDetail}
            onRoleChange={handleRoleChange}
            onPlanChange={handleUserPlanChange}
            onBan={handleBan}
          />
        )}

        {activePage === 'feedback' && (
          <AdminFeedbackView
            feedback={feedback}
            moderationQueue={moderationQueue}
            loading={sectionLoading.feedback}
            moderationLoading={sectionLoading.moderation}
            error={sectionError.feedback}
            moderationError={sectionError.moderation}
            feedbackPage={feedbackPage}
            feedbackTotalPages={feedbackTotalPages}
            feedbackStatus={feedbackStatus}
            expandedFeedbackId={expandedFeedbackId}
            moderationNotes={moderationNotes}
            currentPermissions={currentPermissions}
            onStatusFilterChange={(v) => { setFeedbackStatus(v); setFeedbackPage(1); }}
            onRatingFilterChange={(v) => { setFeedbackRating(v); setFeedbackPage(1); }}
            onFromChange={(v) => { setFeedbackFrom(v); setFeedbackPage(1); }}
            onToChange={(v) => { setFeedbackTo(v); setFeedbackPage(1); }}
            feedbackRating={feedbackRating}
            feedbackFrom={feedbackFrom}
            feedbackTo={feedbackTo}
            onPageChange={setFeedbackPage}
            onExpandFeedback={setExpandedFeedbackId}
            onModerationNotesChange={(id, notes) => setModerationNotes((prev) => ({ ...prev, [id]: notes }))}
            onReviewFeedback={reviewFeedback}
          />
        )}

        {activePage === 'audit' && currentPermissions.viewAuditLogs && (
          <AdminAuditView
            auditLogs={auditLogs}
            loading={sectionLoading.audit}
            error={sectionError.audit}
            auditPage={auditPage}
            auditTotal={auditTotal}
            auditPageSize={auditPageSize}
            auditActionFilter={auditActionFilter}
            auditAdminFilter={auditAdminFilter}
            auditFrom={auditFrom}
            auditTo={auditTo}
            auditActions={auditActions}
            auditAdmins={auditAdmins}
            onActionFilterChange={(v) => { setAuditActionFilter(v); setAuditPage(1); }}
            onAdminFilterChange={(v) => { setAuditAdminFilter(v); setAuditPage(1); }}
            onFromChange={(v) => { setAuditFrom(v); setAuditPage(1); }}
            onToChange={(v) => { setAuditTo(v); setAuditPage(1); }}
            onPageChange={setAuditPage}
            onExportCSV={handleExportAuditCSV}
            onExportJSON={handleExportAuditJSON}
            exportLoading={exportAuditLoading}
          />
        )}

        {activePage === 'support' && currentPermissions.manageSupport && (
          <AdminSupportView
            conversations={supportConversations}
            selectedConvId={selectedSupportConv}
            messages={supportMessages}
            convDetail={supportConvDetail}
            searchInput={supportSearchInput}
            statusFilter={supportStatusFilter}
            tagFilter={supportTagFilter}
            onTagFilterChange={setSupportTagFilter}
            convLoading={supportConvLoading}
            userTyping={supportUserTyping}
            userOnline={supportUserOnline}
            pendingAttachments={supportPendingAttachments}
            input={supportInput}
            sending={supportSending}
            admins={supportAdmins}
            menuOpen={supportConvMenuOpen}
            emojiPickerOpen={showSupportEmojiPicker}
            loading={sectionLoading.support}
            error={sectionError.support}
            menuRef={supportConvMenuRef}
            fileInputRef={supportFileInputRef}
            inputRef={supportInputRef}
            emojiPickerRef={supportEmojiPickerRef}
            messagesEndRef={supportMessagesEndRef}
            onSelectConv={setSelectedSupportConv}
            onSearchChange={setSupportSearchInput}
            onStatusFilterChange={setSupportStatusFilter}
            onUpdateConv={(updates) => { if (selectedSupportConv) updateSupportConversation(selectedSupportConv, updates); }}
            onExportConversation={handleExportSupportConversation}
            onInputChange={handleSupportInputChange}
            onInputKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendSupportReply(); }}
            onRemoveAttachment={(url) => setSupportPendingAttachments((p) => p.filter((x) => x.url !== url))}
            onAttachFile={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const result = await uploadSupportFile(file);
              if (result) setSupportPendingAttachments((p) => [...p, result]);
              e.target.value = '';
            }}
            onSend={sendSupportReply}
            setMenuOpen={setSupportConvMenuOpen}
            setEmojiPickerOpen={setShowSupportEmojiPicker}
            setInput={setSupportInput}
          />
        )}

        {activePage === 'announcements' && (
          <AdminAnnouncementsView
            announcements={announcements}
            loading={sectionLoading.announcements}
            error={sectionError.announcements}
            currentPermissions={currentPermissions}
            onNewAnnouncement={() => { setEditingAnnouncement({ id: '', message: '', active: true, priority: 'info', starts_at: '', ends_at: '', show_on: ['public', 'user_app', 'admin_app'], isNew: true }); setShowAnnouncementModal(true); }}
            onEditAnnouncement={(a) => {
              const showOn = (a.show_on || 'public,user_app,admin_app').toString().split(',').map((s: string) => s.trim()).filter(Boolean);
              setEditingAnnouncement({ ...a, show_on: showOn.length ? showOn : ['public', 'user_app', 'admin_app'], isNew: false });
              setShowAnnouncementModal(true);
            }}
            onDeleteAnnouncement={async (a) => {
              if (confirm(t('admin.deleteAnnouncementConfirm'))) {
                try {
                  await apiRequest(`/api/admin/announcements/${a.id}`, { method: 'DELETE', headers });
                  notify(t('admin.announcementDeleted'));
                  loadAnnouncements();
                } catch (err: any) {
                  notify(err.message, 'error');
                }
              }
            }}
          />
        )}

        {activePage === 'redirects' && currentPermissions.manageRedirects && (
          <AdminRedirectsView
            redirects={redirects}
            loading={sectionLoading.redirects}
            error={sectionError.redirects}
            currentPermissions={currentPermissions}
            onNewRedirect={() => {
              setEditingRedirect({ id: '', from_path: '/', to_path: '/dashboard', active: 1, isNew: true });
              setShowRedirectModal(true);
              loadAvailablePages();
            }}
            onEditRedirect={(r) => {
              setEditingRedirect({ ...r, isNew: false });
              setShowRedirectModal(true);
              loadAvailablePages();
            }}
            onDeleteRedirect={handleDeleteRedirect}
            onToggleActive={handleToggleRedirectActive}
          />
        )}

        {activePage === 'promos' && currentPermissions.managePromoCodes && (
          <AdminPromoCodesView
            promos={promos}
            plans={plans}
            loading={sectionLoading.promos}
            error={sectionError.promos}
            currentPermissions={currentPermissions}
            onNewPromo={() => {
              setEditingPromo({ id: '', code: '', type: 'discount', discount_percent: 10, plan_id: null, plan_months: 1, valid_from: '', valid_until: '', max_uses: null, max_uses_per_user: null, active: 1, isNew: true });
              setShowPromoModal(true);
            }}
            onEditPromo={(p) => {
              setEditingPromo({ ...p, max_uses_per_user: (p as any).max_uses_per_user ?? null, isNew: false });
              setShowPromoModal(true);
            }}
            onDeletePromo={handleDeletePromo}
          />
        )}

        {activePage === 'sessions' && currentPermissions.viewSessionReplay && (
          <AdminSessionsView />
        )}

        {activePage === 'heatmaps' && currentPermissions.viewSessionReplay && (
          <AdminHeatmapView />
        )}

        {activePage === 'tour' && currentPermissions.viewAnalytics && (
          <AdminTourView />
        )}

        {activePage === 'security' && currentPermissions.viewAuditLogs && (
          <AdminSecurityView
            stats={securityStats}
            events={securityEvents}
            blockedIPs={securityBlockedIPs}
            eventsLoading={!!sectionLoading.securityEvents}
            statsLoading={!!sectionLoading.securityStats}
            blockedIPsLoading={!!sectionLoading.securityBlockedIPs}
            eventsError={sectionError.securityEvents || null}
            eventsPage={securityPage}
            eventsTotal={securityTotal}
            eventsPageSize={securityPageSize}
            typeFilter={securityTypeFilter}
            ipFilter={securityIPFilter}
            fromDate={securityFrom}
            toDate={securityTo}
            canManage={currentPermissions.manageUsers}
            onTypeFilterChange={(v) => { setSecurityTypeFilter(v); setSecurityPage(1); }}
            onIPFilterChange={(v) => { setSecurityIPFilter(v); setSecurityPage(1); }}
            onFromChange={(v) => { setSecurityFrom(v); setSecurityPage(1); }}
            onToChange={(v) => { setSecurityTo(v); setSecurityPage(1); }}
            onPageChange={setSecurityPage}
            onBlockIP={handleBlockIP}
            onUnblockIP={handleUnblockIP}
          />
        )}

        {activePage === 'status' && currentPermissions.viewAnalytics && (
          <AdminStatusView
            status={fullSystemStatus}
            loading={statusLoading}
            lastUpdated={statusLastUpdated}
            onRefresh={loadFullStatus}
            onNavigate={navigateToPage}
          />
        )}

        {activePage === 'contacts' && currentPermissions.manageSupport && (
          <AdminContactsView
            contacts={contacts}
            loading={sectionLoading.contacts}
            error={sectionError.contacts}
            page={contactPage}
            totalPages={Math.max(1, Math.ceil(contactTotal / contactPageSize))}
            from={contactFrom}
            to={contactTo}
            search={contactSearch}
            onFromChange={(v) => { setContactFrom(v); setContactPage(1); }}
            onToChange={(v) => { setContactTo(v); setContactPage(1); }}
            onSearchChange={(v) => { setContactSearch(v); setContactPage(1); }}
            onPageChange={(p) => { setContactPage(p); loadContacts(p); }}
            onRefresh={() => loadContacts(contactPage)}
          />
        )}

        </main>
      </div>

      {showAnnouncementModal && editingAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editingAnnouncement.isNew ? t('admin.newAnnouncement') : t('admin.editAnnouncementTitle')}</h2>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.message')}</label>
                <textarea required value={editingAnnouncement.message} onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, message: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={3} placeholder={t('admin.messagePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.priority')}</label>
                <select value={editingAnnouncement.priority || 'info'} onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, priority: e.target.value as 'info' | 'warning' | 'success' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="info">{t('admin.info')}</option>
                  <option value="warning">{t('admin.warning')}</option>
                  <option value="success">{t('admin.success')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.startsAt')}</label>
                  <input type="datetime-local" value={editingAnnouncement.starts_at ? editingAnnouncement.starts_at.slice(0, 16) : ''} onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, starts_at: e.target.value ? e.target.value + ':00.000Z' : '' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.endsAt')}</label>
                  <input type="datetime-local" value={editingAnnouncement.ends_at ? editingAnnouncement.ends_at.slice(0, 16) : ''} onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, ends_at: e.target.value ? e.target.value + ':00.000Z' : '' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">{t('admin.showOnPages')}</p>
                <div className="flex flex-wrap gap-4">
                  {(['public', 'user_app', 'admin_app'] as const).map((page) => {
                    const arr = Array.isArray(editingAnnouncement.show_on) ? editingAnnouncement.show_on : ['public', 'user_app', 'admin_app'];
                    const checked = arr.includes(page);
                    return (
                      <label key={page} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? (arr.includes(page) ? arr : [...arr, page])
                              : arr.filter((p) => p !== page);
                            setEditingAnnouncement({ ...editingAnnouncement, show_on: next.length > 0 ? next : ['public', 'user_app', 'admin_app'] });
                          }}
                        />
                        <span className="text-sm text-slate-700">{t(`admin.showOn_${page}`)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ann-active" checked={!!editingAnnouncement.active} onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, active: e.target.checked })} />
                <label htmlFor="ann-active" className="text-sm text-slate-700">{t('admin.activeVisible')}</label>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAnnouncementModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">{t('admin.cancel')}</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium">{t('admin.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRedirectModal && editingRedirect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editingRedirect.isNew ? t('admin.addRedirect') : t('admin.editRedirect')}</h2>
              <button onClick={() => setShowRedirectModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveRedirect} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.fromPath')}</label>
                <select
                  value={availablePages.some((p) => p.path === editingRedirect.from_path) ? editingRedirect.from_path : '__custom__'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditingRedirect({ ...editingRedirect, from_path: v === '__custom__' ? '' : v });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {availablePages.map((p) => (
                    <option key={p.path} value={p.path}>{p.label}</option>
                  ))}
                  <option value="__custom__">{t('admin.customUrl')}</option>
                </select>
                {(!availablePages.some((p) => p.path === editingRedirect.from_path) || editingRedirect.from_path === '') && (
                  <input
                    type="text"
                    value={editingRedirect.from_path}
                    onChange={(e) => setEditingRedirect({ ...editingRedirect, from_path: e.target.value })}
                    placeholder="/"
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.toPath')}</label>
                <select
                  value={availablePages.some((p) => p.path === editingRedirect.to_path) ? editingRedirect.to_path : '__custom__'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditingRedirect({ ...editingRedirect, to_path: v === '__custom__' ? '' : v });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {availablePages.map((p) => (
                    <option key={p.path} value={p.path}>{p.label}</option>
                  ))}
                  <option value="__custom__">{t('admin.customUrl')}</option>
                </select>
                {!availablePages.some((p) => p.path === editingRedirect.to_path) && (
                  <input
                    type="text"
                    value={editingRedirect.to_path}
                    onChange={(e) => setEditingRedirect({ ...editingRedirect, to_path: e.target.value })}
                    placeholder="/dashboard or https://..."
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="redir-active" checked={!!editingRedirect.active} onChange={(e) => setEditingRedirect({ ...editingRedirect, active: e.target.checked ? 1 : 0 })} />
                <label htmlFor="redir-active" className="text-sm text-slate-700">{t('admin.activeVisible')}</label>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowRedirectModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">{t('admin.cancel')}</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium">{t('admin.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPromoModal && editingPromo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editingPromo.isNew ? t('admin.addPromo') : t('admin.editPromo')}</h2>
              <button onClick={() => setShowPromoModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePromo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.promoCode')}</label>
                <input
                  type="text"
                  required
                  value={editingPromo.code}
                  onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  placeholder="SAVE20"
                  disabled={!editingPromo.isNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.promoType')}</label>
                <select value={editingPromo.type} onChange={(e) => setEditingPromo({ ...editingPromo, type: e.target.value as 'discount' | 'plan_time' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="discount">{t('admin.promoTypeDiscount')}</option>
                  <option value="plan_time">{t('admin.promoTypePlanTime')}</option>
                </select>
              </div>
              {editingPromo.type === 'discount' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.discountPercent')}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingPromo.discount_percent ?? 0}
                    onChange={(e) => setEditingPromo({ ...editingPromo, discount_percent: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
              {editingPromo.type === 'plan_time' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.plan')}</label>
                    <select value={editingPromo.plan_id || ''} onChange={(e) => setEditingPromo({ ...editingPromo, plan_id: e.target.value || null })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.planMonths')}</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={editingPromo.plan_months ?? 1}
                      onChange={(e) => setEditingPromo({ ...editingPromo, plan_months: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.validFrom')}</label>
                  <input type="datetime-local" value={editingPromo.valid_from ? editingPromo.valid_from.slice(0, 16) : ''} onChange={(e) => setEditingPromo({ ...editingPromo, valid_from: e.target.value ? e.target.value + ':00.000Z' : '' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.validUntil')}</label>
                  <input type="datetime-local" value={editingPromo.valid_until ? editingPromo.valid_until.slice(0, 16) : ''} onChange={(e) => setEditingPromo({ ...editingPromo, valid_until: e.target.value ? e.target.value + ':00.000Z' : '' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.maxUses')}</label>
                  <input type="number" min={0} value={editingPromo.max_uses ?? ''} onChange={(e) => setEditingPromo({ ...editingPromo, max_uses: e.target.value ? parseInt(e.target.value, 10) : null })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder={t('admin.unlimited')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.maxUsesPerUser')}</label>
                  <input type="number" min={1} value={editingPromo.max_uses_per_user ?? ''} onChange={(e) => setEditingPromo({ ...editingPromo, max_uses_per_user: e.target.value ? parseInt(e.target.value, 10) : null })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder={t('admin.unlimited')} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="promo-active" checked={editingPromo.active !== 0} onChange={(e) => setEditingPromo({ ...editingPromo, active: e.target.checked ? 1 : 0 })} />
                <label htmlFor="promo-active" className="text-sm text-slate-700">{t('admin.activeVisible')}</label>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPromoModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">{t('admin.cancel')}</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium">{t('admin.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{t('admin.createUser')}</h2>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.email')}</label>
                <input type="email" required value={createUserForm.email} onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.password')}</label>
                <input type="password" required minLength={8} value={createUserForm.password} onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder={t('admin.passwordPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.nameOptional')}</label>
                <input type="text" value={createUserForm.name} onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.plan')}</label>
                <select value={createUserForm.plan_id} onChange={(e) => setCreateUserForm({ ...createUserForm, plan_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowCreateUserModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">{t('admin.cancel')}</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium">{t('admin.createUser')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlanModal && editingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{editingPlan.isNew ? t('admin.createPlan') : t('admin.editPlanTitle')}</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto flex-1 min-h-0">
              {editingPlan.isNew && (
                <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-indigo-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    {t('admin.createPlanWithAI')}
                  </h3>
                  <p className="text-xs text-indigo-700">{t('admin.createPlanWithAIDesc')}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={planAiPrompt}
                      onChange={(e) => setPlanAiPrompt(e.target.value)}
                      placeholder={t('admin.createPlanWithAIPlaceholder')}
                      className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm placeholder:text-indigo-400/70"
                      disabled={planAiLoading}
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePlanWithAI}
                      disabled={!planAiPrompt.trim() || planAiLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      {planAiLoading ? t('admin.generating') : t('admin.generate')}
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {editingPlan.isNew && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.planId')}</label>
                      <input
                        type="text"
                        required
                        value={editingPlan.id}
                        onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        className={`w-full px-3 py-2 border rounded-lg ${planValidationError ? 'border-red-500' : 'border-slate-300'}`}
                        aria-invalid={!!planValidationError}
                        aria-describedby={planValidationError ? 'plan-id-error' : undefined}
                      />
                      {planValidationError && (
                        <p id="plan-id-error" className="text-sm text-red-600 mt-1">{planValidationError}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{t('admin.planIdFormat')}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.planName')}</label>
                    <input type="text" required value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.pricePerMonth')}</label><input type="number" required min="0" step="1" value={editingPlan.price} onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value, 10) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.minutesLimit')}</label><input type="number" required min="0" step="1" value={editingPlan.minutes_limit} onChange={(e) => setEditingPlan({ ...editingPlan, minutes_limit: parseInt(e.target.value, 10) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.languageChangesLimit')}</label>
                    <input type="number" min="-1" step="1" placeholder="-1 = unlimited" value={editingPlan.language_changes_limit ?? -1} onChange={(e) => { const v = parseInt(e.target.value, 10); setEditingPlan({ ...editingPlan, language_changes_limit: isNaN(v) ? -1 : v }); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                    <p className="text-xs text-slate-500 mt-1">{t('admin.langChangesHint')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <h3 className="text-sm font-medium text-slate-700">{t('admin.planFeatures')}</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!(editingPlan.video_caption === true || editingPlan.video_caption === 1)} onChange={(e) => setEditingPlan({ ...editingPlan, video_caption: e.target.checked })} className="rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{t('admin.featureVideoCaption')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!(editingPlan.cloud_save === true || editingPlan.cloud_save === 1)} onChange={(e) => setEditingPlan({ ...editingPlan, cloud_save: e.target.checked })} className="rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{t('admin.featureCloudSave')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!(editingPlan.pro_analysis_enabled === true || editingPlan.pro_analysis_enabled === 1)} onChange={(e) => setEditingPlan({ ...editingPlan, pro_analysis_enabled: e.target.checked })} className="rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{t('admin.featureProAnalysis')}</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.transcriptModel')}</label>
                        <select value={editingPlan.transcript_model || 'gemini-2.5-flash'} onChange={(e) => setEditingPlan({ ...editingPlan, transcript_model: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                          <option value="gemini-2.5-flash">{t('admin.modelFlash')}</option>
                          <option value="gemini-3.1-pro-preview">{t('admin.modelPro')}</option>
                          <option value="gemini-2.5-pro">{t('admin.modelPro25')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.analysisModel')}</label>
                        <select value={editingPlan.analysis_model || 'gemini-2.5-flash'} onChange={(e) => setEditingPlan({ ...editingPlan, analysis_model: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                          <option value="gemini-2.5-flash">{t('admin.modelFlash')}</option>
                          <option value="gemini-3.1-pro-preview">{t('admin.modelPro')}</option>
                          <option value="gemini-2.5-pro">{t('admin.modelPro25')}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Soft Limit %</label>
                        <input type="number" min={1} max={200} value={editingPlan.soft_limit_percent ?? 100} onChange={(e) => setEditingPlan({ ...editingPlan, soft_limit_percent: Number(e.target.value) || 100 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        <p className="text-xs text-slate-500 mt-1">Warning at this % of limit</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hard Limit %</label>
                        <input type="number" min={1} max={200} value={editingPlan.hard_limit_percent ?? 100} onChange={(e) => setEditingPlan({ ...editingPlan, hard_limit_percent: Number(e.target.value) || 100 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        <p className="text-xs text-slate-500 mt-1">Hard stop at this % of limit</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-indigo-700">{t('admin.costEstimator')}</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={planEstimateFeatures.videoCaption} onChange={(e) => setPlanEstimateFeatures((f) => ({ ...f, videoCaption: e.target.checked }))} className="rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{t('admin.featureVideoCaption')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={planEstimateFeatures.cloudSave} onChange={(e) => setPlanEstimateFeatures((f) => ({ ...f, cloudSave: e.target.checked }))} className="rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{t('admin.featureCloudSave')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={planEstimateFeatures.unlimitedTranslations} onChange={(e) => setPlanEstimateFeatures((f) => ({ ...f, unlimitedTranslations: e.target.checked }))} className="rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{t('admin.featureUnlimitedTranslations')}</span>
                      </label>
                    </div>
                    {planEstimate && (
                      <div className="space-y-1 pt-2 border-t border-slate-200">
                        <p className="text-sm text-slate-600">{t('admin.estimatedCost')}: <span className="font-medium">${planEstimate.estimatedCostPerUserMonth.toFixed(2)}</span> {t('admin.perUserMonth')}</p>
                        <p className="text-sm text-slate-600">{t('admin.suggestedPrice')}: <span className="font-medium">${planEstimate.suggestedPriceMin}–${planEstimate.suggestedPriceMax}</span> {t('admin.perUserMonth')}</p>
                        <button type="button" onClick={handleApplySuggestedPrice} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">{t('admin.applySuggested')}</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-6 mt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowPlanModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50">{t('admin.cancel')}</button>
                <button type="submit" disabled={!!planValidationError} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium">{t('admin.savePlan')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userDetailId && userDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{t('admin.userDetail')}</h2>
              <div className="flex items-center gap-2">
                {userDetailId && userDetailId !== 'admin-1' && currentPermissions.manageUsers && (
                  <button onClick={handleRevokeSessions} className="text-sm text-amber-600 hover:text-amber-700 font-medium">{t('admin.revokeSessionsBtn')}</button>
                )}
                <button onClick={() => { setUserDetailId(null); setUserDetail(null); }} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4 text-sm overflow-y-auto">
              <div><div className="text-slate-500">{t('admin.email')}</div><div className="font-medium text-slate-900">{userDetail.user?.email}</div></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3"><div className="text-slate-500">{t('admin.meetingsMonth')}</div><div className="text-xl font-semibold">{userDetail.usage?.meetingsCount || 0}</div></div>
                <div className="rounded-xl border border-slate-200 p-3"><div className="text-slate-500">{t('admin.secondsMonth')}</div><div className="text-xl font-semibold">{userDetail.usage?.totalSeconds || 0}</div></div>
                <div className="rounded-xl border border-slate-200 p-3"><div className="text-slate-500">{t('admin.feedbackCount')}</div><div className="text-xl font-semibold">{userDetail.feedbackCount || 0}</div></div>
              </div>
              {currentPermissions.manageUsers && (
                <div className="space-y-3">
                  <form onSubmit={handleUsageOverride} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.extraMinutesOverride')}</label>
                      <input type="number" min={0} value={usageOverrideValue} onChange={(e) => setUsageOverrideValue(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                    </div>
                    <button type="submit" disabled={usageOverrideSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
                      {usageOverrideSaving ? t('admin.saving') : t('admin.save')}
                    </button>
                  </form>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-700 mb-2">Per-User Feature Overrides</p>
                    <p className="text-xs text-slate-500 mb-3">Set to override plan defaults. Leave empty to use plan value.</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { label: 'Language Changes', key: 'language_changes_override', type: 'number' as const },
                        { label: 'Video Caption', key: 'video_caption_override', type: 'boolean' as const },
                        { label: 'Cloud Save', key: 'cloud_save_override', type: 'boolean' as const },
                        { label: 'Pro Analysis', key: 'pro_analysis_override', type: 'boolean' as const },
                      ].map(({ label, key, type }) => (
                        <div key={key} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-slate-600">{label}</span>
                          {type === 'boolean' ? (
                            <select
                              value={userDetail.user?.[key] == null ? '' : String(userDetail.user[key])}
                              onChange={async (e) => {
                                const val = e.target.value === '' ? null : e.target.value === '1';
                                try {
                                  await apiRequest(`/api/admin/users/${userDetailId}/overrides`, {
                                    method: 'PUT', headers,
                                    body: JSON.stringify({ [key]: val }),
                                  });
                                  notify('Override saved');
                                  loadUserDetail(userDetailId!);
                                } catch (err: any) { notify(err.message, 'error'); }
                              }}
                              className="px-2 py-1 border border-slate-200 rounded text-xs w-24"
                            >
                              <option value="">Plan default</option>
                              <option value="1">Enabled</option>
                              <option value="0">Disabled</option>
                            </select>
                          ) : (
                            <input
                              type="number"
                              min={-1}
                              placeholder="Plan default"
                              value={userDetail.user?.[key] ?? ''}
                              onChange={async (e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                try {
                                  await apiRequest(`/api/admin/users/${userDetailId}/overrides`, {
                                    method: 'PUT', headers,
                                    body: JSON.stringify({ [key]: val }),
                                  });
                                  notify('Override saved');
                                  loadUserDetail(userDetailId!);
                                } catch (err: any) { notify(err.message, 'error'); }
                              }}
                              className="px-2 py-1 border border-slate-200 rounded text-xs w-24"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {userDetail.user?.plan_expires_at && (
                      <p className="text-xs text-slate-500 mt-2">Plan expires: {new Date(userDetail.user.plan_expires_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              )}
              {(() => {
                const meetings = (userDetail.recentMeetings || []).map((m: { id: string; title: string; date: string; duration: number }) => ({ type: 'meeting' as const, id: m.id, date: m.date, data: m }));
                const feedback = (userDetail.recentFeedback || []).map((f: { id: string; meeting_id: string; rating: number; comment: string; status: string; created_at: string }) => ({ type: 'feedback' as const, id: f.id, date: f.created_at, data: f }));
                const audits = (userDetail.recentAuditEvents || []).map((a: { id: string; action: string; admin_email: string; created_at: string }) => ({ type: 'audit' as const, id: a.id, date: a.created_at, data: a }));
                const timeline = [...meetings, ...feedback, ...audits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
                return timeline.length > 0 ? (
                  <div>
                    <div className="text-slate-500 font-medium mb-2">{t('admin.activityTimeline')}</div>
                    <ul className="space-y-2">
                      {timeline.map((item) => (
                        <li key={`${item.type}-${item.id}`} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                          {item.type === 'meeting' && (
                            <>
                              <Activity className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-800">{(item.data as any).title || 'Untitled'}</span>
                                    <a href={`/meetings/${(item.data as any).id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline">{t('admin.viewMeeting')}</a>
                                </div>
                                <span className="text-slate-500 text-xs">· {(item.data as any).duration != null ? `${Math.round((item.data as any).duration / 60)} min` : '—'}</span>
                                <div className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleString() : '—'}</div>
                              </div>
                            </>
                          )}
                          {item.type === 'feedback' && (
                            <>
                              <MessageSquare className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-slate-700">{(item.data as any).rating}★</span>
                                  <span className="text-slate-500 text-xs">· {(item.data as any).status}</span>
                                  {(item.data as any).meeting_id && (
                                    <a href={`/meetings/${(item.data as any).meeting_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">{t('admin.viewMeeting')}</a>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 truncate">{(item.data as any).comment}</div>
                                <div className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleString() : '—'}</div>
                              </div>
                            </>
                          )}
                          {item.type === 'audit' && (
                            <>
                              <ScrollText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-xs text-slate-700">{(item.data as any).action}</span>
                                <span className="text-slate-500 text-xs ms-1">{t('admin.by')} {(item.data as any).admin_email || '—'}</span>
                                <div className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleString() : '—'}</div>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
