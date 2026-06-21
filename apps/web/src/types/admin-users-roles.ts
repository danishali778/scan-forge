import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export type AdminRole = "Owner" | "Admin" | "Operator" | "Reviewer" | "Viewer";

export type UserStatus = "Active" | "Invited" | "Disabled";

export type AuthLinkStatus = "Linked" | "Pending" | "Unknown";

export type PermissionGrant = "full" | "view" | "none";

export interface AdminNavigationItem {
  label: string;
  icon: ComponentType<LucideProps>;
  active?: boolean;
  badge?: number;
  danger?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: UserStatus;
  role: AdminRole;
  lastLogin: string;
  authLink: AuthLinkStatus;
  createdAt: string;
  isCurrentUser?: boolean;
  avatarTone: string;
  invitation: string;
  authMethod: string;
  supabaseUser: AuthLinkStatus;
  userId: string;
  joinedAt: string;
  mfa: "Enabled" | "Not enabled";
  scim: string;
  recentAuditEvents: AuditEvent[];
}

export interface AuditEvent {
  time: string;
  action: string;
  source: string;
}

export interface PermissionMatrixRow {
  area: string;
  permission: string;
  icon: ComponentType<LucideProps>;
  grants: Record<AdminRole, PermissionGrant>;
}

export interface StatusInfoCard {
  title: string;
  body: string;
  tone: "warning" | "neutral" | "danger";
}
