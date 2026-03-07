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

const fullAccessPermissions: AdminPermissions = {
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

export const getAdminPermissions = (adminId: string): AdminPermissions => {
  return fullAccessPermissions;
};

