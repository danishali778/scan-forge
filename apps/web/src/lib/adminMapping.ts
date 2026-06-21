import type { AdminRole, AdminUser, AuthLinkStatus, UserStatus } from "@/types/admin-users-roles";
import type { ApiUser } from "@/types/api";

function role(value: string): AdminRole {
  if (value === "Owner" || value === "Admin" || value === "Operator" || value === "Reviewer" || value === "Viewer") {
    return value;
  }

  return "Viewer";
}

function status(value: string): UserStatus {
  if (value === "active") {
    return "Active";
  }

  if (value === "blocked" || value === "disabled") {
    return "Disabled";
  }

  return "Invited";
}

function authLink(linked: boolean, userStatus: UserStatus): AuthLinkStatus {
  if (linked) {
    return "Linked";
  }

  return userStatus === "Invited" ? "Pending" : "Unknown";
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function mapAdminUser(user: ApiUser): AdminUser {
  const displayName = user.name || user.email.split("@")[0] || user.email;
  const mappedStatus = status(user.status);
  const mappedAuthLink = authLink(user.supabase_linked, mappedStatus);

  return {
    id: user.id,
    name: displayName,
    initials: initials(displayName, user.email),
    email: user.email,
    status: mappedStatus,
    role: role(user.role),
    lastLogin: "Backend session managed",
    authLink: mappedAuthLink,
    createdAt: "Backend user",
    avatarTone: user.supabase_linked ? "bg-teal-700 text-white ring-teal-100" : "bg-white text-slate-700 ring-slate-200",
    invitation: mappedStatus === "Invited" ? "Waiting for first login" : "Accepted",
    authMethod: user.supabase_linked ? "Supabase Auth" : "Invitation-lite",
    supabaseUser: mappedAuthLink,
    userId: user.id,
    joinedAt: mappedStatus === "Invited" ? "-" : "Backend user",
    mfa: "Not enabled",
    scim: "-",
    recentAuditEvents: [],
  };
}
