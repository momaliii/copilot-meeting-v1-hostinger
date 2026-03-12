export type Plan = {
  id: string;
  name: string;
  price: number;
  minutes_limit: number;
  language_changes_limit?: number;
  video_caption?: boolean | number;
  cloud_save?: boolean | number;
  pro_analysis_enabled?: boolean | number;
  analysis_model?: string;
  transcript_model?: string;
  user_count?: number;
};

export type UserRow = {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  status: 'active' | 'banned';
  plan_id: string;
};

export type FeedbackRow = {
  id: string;
  user_email: string;
  meeting_id?: string;
  meeting_title?: string;
  rating: number;
  comment: string;
  status: 'pending' | 'accepted' | 'rejected';
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  review_notes?: string;
};

export type AdminPermissions = {
  viewUsers: boolean;
  manageUsers: boolean;
  manageRoles: boolean;
  managePlans: boolean;
  managePromoCodes: boolean;
  moderateFeedback: boolean;
  viewAnalytics: boolean;
  viewAuditLogs: boolean;
  manageSupport: boolean;
  manageAnnouncements: boolean;
  manageRedirects: boolean;
  viewSessionReplay: boolean;
};

export type AdminPage = 'dashboard' | 'plans' | 'users' | 'feedback' | 'audit' | 'announcements' | 'support' | 'redirects' | 'promos' | 'contacts' | 'sessions' | 'heatmaps' | 'tour' | 'security' | 'status';
