import { ChevronDown, Copy, Pencil, UsersRound, X } from "lucide-react";
import { useState } from "react";

import {
  AuthLinkBadge,
  UserAvatar,
  UserStatusBadge,
} from "@/components/admin-users-roles/AdminUsersRolesBadges";
import { roleOptions } from "@/mocks/admin-users-roles";
import type { AdminRole, AdminUser } from "@/types/admin-users-roles";

const detailTabs = ["Details", "Permissions", "Activity", "Sessions"] as const;

interface SelectedUserPanelProps {
  user: AdminUser;
  onRoleChange: (userId: string, role: AdminRole) => void;
}

export function SelectedUserPanel({ user, onRoleChange }: SelectedUserPanelProps) {
  const [activeTab, setActiveTab] = useState<(typeof detailTabs)[number]>("Details");

  return (
    <aside className="flex min-h-0 w-[452px] shrink-0 flex-col rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <h2 className="text-[16px] font-semibold text-slate-950">Selected user</h2>
        <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar initials={user.initials} tone={user.avatarTone} size="lg" />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-slate-950">{user.name}</div>
            <div className="truncate text-[13px] text-slate-500">{user.email}</div>
          </div>
        </div>
        <UserStatusBadge status={user.status} />
      </div>

      <div className="mt-5 flex h-11 border-b border-slate-200 px-5">
        {detailTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              "relative mr-8 text-[13px] font-semibold transition last:mr-0",
              activeTab === tab ? "text-teal-800" : "text-slate-500 hover:text-slate-900",
            ].join(" ")}
          >
            {tab}
            {activeTab === tab ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {activeTab === "Details" ? (
          <DetailsContent user={user} onRoleChange={onRoleChange} />
        ) : activeTab === "Permissions" ? (
          <CompactList
            title={`${user.role} access`}
            rows={[
              ["Workspace", "Can access workspace"],
              ["Admin", user.role === "Owner" || user.role === "Admin" ? "Manage users and settings" : "Restricted"],
              ["Reports", user.role === "Viewer" ? "View reports" : "Create and export reports"],
            ]}
          />
        ) : activeTab === "Activity" ? (
          <CompactList title="Recent activity" rows={user.recentAuditEvents.map((event) => [event.time, event.action])} />
        ) : (
          <CompactList
            title="Recent sessions"
            rows={[
              ["External staging review", user.status === "Active" ? "Accessed Jun 19, 2026" : "No access yet"],
              ["Mobile API assessment", user.role === "Viewer" ? "View only" : "Assigned"],
            ]}
          />
        )}
      </div>

      <div className="border-t border-slate-200 px-5 py-5">
        <button
          type="button"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-[14px] font-semibold text-white shadow-sm hover:bg-teal-800"
        >
          <Pencil className="h-4 w-4" />
          Update role
        </button>
        <button
          type="button"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-300 bg-white text-[14px] font-semibold text-red-600 hover:bg-red-50"
        >
          <UsersRound className="h-4 w-4" />
          Disable user
        </button>
        <p className="mt-3 text-[12px] text-slate-500">Disabling revokes access immediately.</p>
      </div>
    </aside>
  );
}

function DetailsContent({
  user,
  onRoleChange,
}: {
  user: AdminUser;
  onRoleChange: (userId: string, role: AdminRole) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-slate-950">Role</h3>
          <button type="button" className="text-[13px] font-semibold text-blue-700 hover:text-blue-800">
            Manage roles
          </button>
        </div>
        <label className="relative mt-3 block w-[200px]">
          <select
            value={user.role}
            onChange={(event) => onRoleChange(user.id, event.target.value as AdminRole)}
            className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-4 pr-9 text-[13px] font-semibold text-slate-800 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-600/10"
          >
            {roleOptions.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </label>
      </section>

      <Section title="Account status">
        <DetailRow label="Status"><UserStatusBadge status={user.status} /></DetailRow>
        <DetailRow label="Invitation" value={user.invitation} />
        <DetailRow label="Auth method" value={user.authMethod} />
        <DetailRow label="Supabase user"><AuthLinkBadge status={user.supabaseUser} /></DetailRow>
        <DetailRow label="User ID">
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="truncate">{user.userId}</span>
            <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </span>
        </DetailRow>
      </Section>

      <Section title="Workspace access">
        <DetailRow label="Joined" value={user.joinedAt} />
        <DetailRow label="Last login" value={user.lastLogin} />
        <DetailRow label="MFA">
          {user.mfa === "Enabled" ? (
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">
              Enabled
            </span>
          ) : (
            <span>{user.mfa}</span>
          )}
        </DetailRow>
        <DetailRow label="SCIM" value={user.scim} />
      </Section>

      <Section
        title="Recent audit events"
        action={<button type="button" className="text-[13px] font-semibold text-blue-700">View all</button>}
      >
        <div className="space-y-3">
          {user.recentAuditEvents.map((event) => (
            <div key={`${event.time}-${event.action}`} className="grid grid-cols-[128px_minmax(0,1fr)_34px] gap-3 text-[12px]">
              <span className="text-slate-600">{event.time}</span>
              <span className="truncate font-medium text-slate-700">{event.action}</span>
              <span className="text-right text-slate-500">{event.source}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-slate-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-7 grid-cols-[130px_minmax(0,1fr)] items-center gap-3 text-[12px]">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="min-w-0 font-medium text-slate-700">{children ?? value}</span>
    </div>
  );
}

function CompactList({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={`${label}-${value}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-[13px] font-semibold text-slate-800">{label}</div>
            <div className="mt-1 text-[12px] text-slate-500">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
