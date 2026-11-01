/**
 * Role-Based Access Control (RBAC) Utility
 * Manages user roles and permissions
 */

import { Logger } from '@/services/logger';

export enum UserRole {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  GOLD = 'gold',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum Permission {
  // User permissions
  VIEW_PROFILE = 'view_profile',
  EDIT_PROFILE = 'edit_profile',
  VIEW_HOROSCOPE = 'view_horoscope',
  VIEW_PANCHANG = 'view_panchang',

  // Kundli permissions
  GENERATE_KUNDLI = 'generate_kundli',
  DOWNLOAD_KUNDLI_PDF = 'download_kundli_pdf',
  UNLIMITED_KUNDLI = 'unlimited_kundli',

  // Chat permissions
  CHAT_WITH_ASTROLOGER = 'chat_with_astrologer',
  VIDEO_CALL = 'video_call',
  PRIORITY_SUPPORT = 'priority_support',
  UNLIMITED_CONSULTATIONS = 'unlimited_consultations',

  // AI permissions
  AI_CHAT_BASIC = 'ai_chat_basic',
  AI_CHAT_UNLIMITED = 'ai_chat_unlimited',

  // Advanced features
  ADVANCED_REPORTS = 'advanced_reports',
  PERSONALIZED_REMEDIES = 'personalized_remedies',
  EXCLUSIVE_CONTENT = 'exclusive_content',
  
  // Admin permissions
  VIEW_ADMIN_DASHBOARD = 'view_admin_dashboard',
  MANAGE_USERS = 'manage_users',
  MANAGE_ASTROLOGERS = 'manage_astrologers',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_PAYMENTS = 'manage_payments',
  MANAGE_CONTENT = 'manage_content',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings',
  
  // Super admin permissions
  MANAGE_ADMINS = 'manage_admins',
  SYSTEM_CONFIGURATION = 'system_configuration',
  DATABASE_ACCESS = 'database_access',
}

/**
 * Role hierarchy levels (higher number = more privileges)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.FREE]: 0,
  [UserRole.BASIC]: 1,
  [UserRole.PREMIUM]: 2,
  [UserRole.GOLD]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.SUPER_ADMIN]: 5,
};

/**
 * Get role level. Unknown role strings are FAIL-CLOSED (-1, below FREE):
 * previously `|| 0` silently mapped any typo/forged string to FREE and
 * granted free-tier access (L3).
 */
export function getRoleLevel(userRole: UserRole | string): number {
  const role = userRole as UserRole;
  const level = ROLE_HIERARCHY[role];
  return typeof level === 'number' ? level : -1;
}

/**
 * Check if user can assign a role
 */
export function canAssignRole(assignerRole: UserRole | string, targetRole: UserRole | string): boolean {
  const assignerLevel = getRoleLevel(assignerRole);
  const targetLevel = getRoleLevel(targetRole);

  // SUPER_ADMIN can assign any role (including other SUPER_ADMIN roles)
  if (assignerRole === UserRole.SUPER_ADMIN || assignerRole === 'super_admin') {
    return true;
  }

  // Only ADMIN and SUPER_ADMIN can assign roles
  if (assignerLevel < ROLE_HIERARCHY[UserRole.ADMIN]) {
    return false;
  }

  // Can only assign roles below your own level
  return assignerLevel > targetLevel;
}

/**
 * Check if role change is an upgrade
 */
export function isRoleUpgrade(currentRole: UserRole | string, newRole: UserRole | string): boolean {
  return getRoleLevel(newRole) > getRoleLevel(currentRole);
}

/**
 * Get available features for a role
 */
export function getAvailableFeatures(userRole: UserRole | string): string[] {
  const features: string[] = [];
  const role = userRole as UserRole;
  
  // Basic features for all
  features.push('horoscope', 'panchang');
  
  // Kundli features
  if (hasPermission(role, Permission.GENERATE_KUNDLI)) {
    features.push('kundli');
  }
  
  // Chat features
  if (hasPermission(role, Permission.CHAT_WITH_ASTROLOGER)) {
    features.push('chat');
  }
  
  if (hasPermission(role, Permission.VIDEO_CALL)) {
    features.push('video-call');
  }
  
  // Premium features
  if (hasPermission(role, Permission.DOWNLOAD_KUNDLI_PDF)) {
    features.push('pdf-download');
  }
  
  if (hasPermission(role, Permission.PRIORITY_SUPPORT)) {
    features.push('priority-support');
  }
  
  if (hasPermission(role, Permission.UNLIMITED_KUNDLI)) {
    features.push('unlimited-kundli');
  }
  
  // AI features
  if (hasPermission(role, Permission.AI_CHAT_UNLIMITED)) {
    features.push('ai-chat-unlimited');
  } else if (hasPermission(role, Permission.AI_CHAT_BASIC)) {
    features.push('ai-chat-basic');
  }
  
  // Admin features
  if (hasPermission(role, Permission.VIEW_ADMIN_DASHBOARD)) {
    features.push('admin');
  }
  
  if (hasPermission(role, Permission.MANAGE_USERS)) {
    features.push('user-management');
  }
  
  if (hasPermission(role, Permission.VIEW_ANALYTICS)) {
    features.push('analytics');
  }
  
  if (hasPermission(role, Permission.SYSTEM_CONFIGURATION)) {
    features.push('system-config');
  }
  
  // Advanced reports
  if ([UserRole.PREMIUM, UserRole.GOLD, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(role)) {
    features.push('advanced-reports');
  }
  
  return features;
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(userRole: UserRole | string, feature: string): boolean {
  const availableFeatures = getAvailableFeatures(userRole);
  return availableFeatures.includes(feature);
}

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.FREE]: [
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.VIEW_HOROSCOPE,
    Permission.VIEW_PANCHANG,
    Permission.AI_CHAT_BASIC,
  ],
  
  [UserRole.BASIC]: [
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.VIEW_HOROSCOPE,
    Permission.VIEW_PANCHANG,
    Permission.GENERATE_KUNDLI,
    Permission.CHAT_WITH_ASTROLOGER,
    Permission.AI_CHAT_BASIC,
  ],
  
  [UserRole.PREMIUM]: [
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.VIEW_HOROSCOPE,
    Permission.VIEW_PANCHANG,
    Permission.GENERATE_KUNDLI,
    Permission.DOWNLOAD_KUNDLI_PDF,
    Permission.UNLIMITED_KUNDLI,
    Permission.CHAT_WITH_ASTROLOGER,
    Permission.VIDEO_CALL,
    Permission.AI_CHAT_UNLIMITED,
    Permission.PRIORITY_SUPPORT,
    Permission.ADVANCED_REPORTS,
  ],
  
  [UserRole.GOLD]: [
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.VIEW_HOROSCOPE,
    Permission.VIEW_PANCHANG,
    Permission.GENERATE_KUNDLI,
    Permission.DOWNLOAD_KUNDLI_PDF,
    Permission.UNLIMITED_KUNDLI,
    Permission.CHAT_WITH_ASTROLOGER,
    Permission.VIDEO_CALL,
    Permission.AI_CHAT_UNLIMITED,
    Permission.PRIORITY_SUPPORT,
    Permission.ADVANCED_REPORTS,
    Permission.UNLIMITED_CONSULTATIONS,
    Permission.PERSONALIZED_REMEDIES,
    Permission.EXCLUSIVE_CONTENT,
  ],
  
  [UserRole.ADMIN]: [
    Permission.VIEW_PROFILE,
    Permission.EDIT_PROFILE,
    Permission.GENERATE_KUNDLI,
    Permission.DOWNLOAD_KUNDLI_PDF,
    Permission.UNLIMITED_KUNDLI,
    Permission.CHAT_WITH_ASTROLOGER,
    Permission.VIDEO_CALL,
    Permission.AI_CHAT_UNLIMITED,
    Permission.PRIORITY_SUPPORT,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ASTROLOGERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_PAYMENTS,
    Permission.MANAGE_CONTENT,
    Permission.VIEW_LOGS,
  ],
  
  [UserRole.SUPER_ADMIN]: [
    // Super admin has all permissions
    ...Object.values(Permission),
  ],
};



/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: UserRole | string): Permission[] {
  const role = userRole as UserRole;
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user is an admin
 */
export function isAdmin(userRole: UserRole | string): boolean {
  const role = userRole as UserRole;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[UserRole.ADMIN];
}

/**
 * Check if a user is a super admin
 */
export function isSuperAdmin(userRole: UserRole | string): boolean {
  const role = userRole as UserRole;
  return role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user can access admin dashboard
 */
export function canAccessAdminDashboard(userRole: UserRole | string): boolean {
  return isAdmin(userRole);
}

/**
 * Get all permissions for a role including inherited permissions
 */
export function getAllPermissions(userRole: UserRole | string): Permission[] {
  const role = userRole as UserRole;
  const allPermissions = new Set<Permission>();

  // Add permissions from current role and all lower roles
  Object.entries(ROLE_HIERARCHY).forEach(([roleName, level]) => {
    if (level <= ROLE_HIERARCHY[role]) {
      const permissions = ROLE_PERMISSIONS[roleName as UserRole] || [];
      permissions.forEach(perm => allPermissions.add(perm));
    }
  });

  return Array.from(allPermissions);
}

/**
 * Check if user has permission (including inherited permissions)
 */
export function hasPermission(userRole: UserRole | string, permission: Permission | string): boolean {
  const allPermissions = getAllPermissions(userRole);
  return allPermissions.includes(permission as Permission);
}

/**
 * Check if user has all permissions in the list (including inherited)
 */
export function hasAllPermissions(userRole: UserRole | string, permissions: (Permission | string)[]): boolean {
  const allUserPermissions = getAllPermissions(userRole);
  return permissions.every(perm => allUserPermissions.includes(perm as Permission));
}

/**
 * Check if user has any permission in the list (including inherited)
 */
export function hasAnyPermission(userRole: UserRole | string, permissions: (Permission | string)[]): boolean {
  const allUserPermissions = getAllPermissions(userRole);
  return permissions.some(perm => allUserPermissions.includes(perm as Permission));
}

/**
 * Get user role from subscription plan
 */
export function getRoleFromPlan(plan: string): UserRole {
  const planLower = plan.toLowerCase();
  
  switch (planLower) {
    case 'free':
      return UserRole.FREE;
    case 'basic':
      return UserRole.BASIC;
    case 'premium':
      return UserRole.PREMIUM;
    case 'gold':
      return UserRole.GOLD;
    case 'admin':
      return UserRole.ADMIN;
    case 'super_admin':
      return UserRole.SUPER_ADMIN;
    default:
      return UserRole.FREE;
  }
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
}

/**
 * Log admin action (in production, this would save to database)
 */
export function logAdminAction(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
  };
  
  // In production, save to database
  if (process.env.NODE_ENV === 'development') {
    Logger.warn('[AUDIT LOG]', { logEntry });
  }
  
  // Server-side audit is authoritative: sensitive admin actions are written
  // to audit_logs via the log_audit() SECURITY DEFINER RPC (migration 012).
  // This client helper is intentionally a local-only no-op in production and
  // must never be relied upon as an audit trail; it logs in dev only.
}

/**
 * Permission error class
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public permission: Permission,
    public userRole: UserRole
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Require permission (throws if not authorized)
 */
export function requirePermission(
  userRole: UserRole | string,
  permission: Permission,
  errorMessage?: string
): void {
  if (!hasPermission(userRole, permission)) {
    throw new PermissionError(
      errorMessage || `Permission denied: ${permission}`,
      permission,
      userRole as UserRole
    );
  }
}

/**
 * Feature flags based on role
 */
export interface FeatureFlags {
  canDownloadPDF: boolean;
  canVideoCall: boolean;
  canAccessPremiumContent: boolean;
  hasUnlimitedAIChat: boolean;
  hasPrioritySupport: boolean;
  canAccessAdminPanel: boolean;
  maxKundliPerMonth: number;
  maxAIChatPerDay: number;
}

/**
 * Get feature flags for a role
 */
export function getFeatureFlags(userRole: UserRole | string): FeatureFlags {
  const role = userRole as UserRole;
  
  return {
    canDownloadPDF: hasPermission(role, Permission.DOWNLOAD_KUNDLI_PDF),
    canVideoCall: hasPermission(role, Permission.VIDEO_CALL),
    canAccessPremiumContent: [UserRole.PREMIUM, UserRole.GOLD, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(role),
    hasUnlimitedAIChat: hasPermission(role, Permission.AI_CHAT_UNLIMITED),
    hasPrioritySupport: hasPermission(role, Permission.PRIORITY_SUPPORT),
    canAccessAdminPanel: canAccessAdminDashboard(role),
    maxKundliPerMonth: role === UserRole.FREE ? 3 : role === UserRole.BASIC ? 10 : -1, // -1 = unlimited
    maxAIChatPerDay: role === UserRole.FREE ? 5 : -1, // -1 = unlimited
  };
}

export default {
  UserRole,
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  isAdmin,
  isSuperAdmin,
  canAccessAdminDashboard,
  getRoleFromPlan,
  logAdminAction,
  requirePermission,
  getFeatureFlags,
  PermissionError,
};
