import { ChevronDown, ListFilter, MoreHorizontal, Search } from "lucide-react";

import { AuthLinkBadge, RoleBadge, UserAvatar, UserStatusBadge } from "@/components/admin-users-roles/AdminUsersRolesBadges";
import { roleOptions } from "@/mocks/admin-users-roles";
import type { AdminRole, AdminUser } from "@/types/admin-users-roles";

interface AdminUsersTableProps {
  users: AdminUser[];
  totalUsers: number;
  query: string;
  roleFilter: "All roles" | AdminRole;
  selectedUserId: string;
  selectedRowIds: string[];
  onQueryChange: (query: string) => void;
  onRoleFilterChange: (role: "All roles" | AdminRole) => void;
  onSelectUser: (userId: string) => void;
  onToggleRow: (userId: string) => void;
  onToggleAll: () => void;
}

export function AdminUsersTable({
  users,
  totalUsers,
  query,
  roleFilter,
  selectedUserId,
  selectedRowIds,
  onQueryChange,
  onRoleFilterChange,
  onSelectUser,
  onToggleRow,
  onToggleAll,
}: AdminUsersTableProps) {
  const allVisibleSelected = users.length > 0 && users.every((user) => selectedRowIds.includes(user.id));

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 px-4 pb-4 pt-5">
        <h1 className="text-[18px] font-semibold text-slate-950">Users</h1>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <label className="relative block w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search users by name or email..."
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-10 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-600/10"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </label>

          <label className="relative block w-[166px]">
            <select
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value as "All roles" | AdminRole)}
              className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-4 pr-9 text-[13px] font-semibold text-slate-800 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-600/10"
            >
              <option>All roles</option>
              {roleOptions.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </label>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ListFilter className="h-4 w-4 text-slate-600" />
            Filters
          </button>
        </div>

        <span className="shrink-0 text-[13px] font-medium text-slate-500">{totalUsers} users</span>
      </div>

      <div className="mx-3 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-[1154px] table-fixed text-left text-[13px]">
          <thead className="h-12 bg-slate-50 text-[12px] font-semibold text-slate-900">
            <tr>
              <th className="w-12 px-4">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleAll}
                  aria-label="Select all visible users"
                  className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                />
              </th>
              <th className="w-[220px] px-2">Name</th>
              <th className="w-[230px] px-2">Email</th>
              <th className="w-[110px] px-2">Status</th>
              <th className="w-[120px] px-2">Role</th>
              <th className="w-[170px] px-2">Last login</th>
              <th className="w-[130px] px-2">Auth link</th>
              <th className="w-[130px] px-2">Created <span className="text-slate-400">v</span></th>
              <th className="w-12 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                className={[
                  "h-[52px] cursor-pointer transition hover:bg-slate-50",
                  user.id === selectedUserId ? "bg-teal-50/55" : "",
                ].join(" ")}
              >
                <td className="px-4" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRowIds.includes(user.id)}
                    onChange={() => onToggleRow(user.id)}
                    aria-label={`Select ${user.name}`}
                    className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                  />
                </td>
                <td className="min-w-0 px-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar initials={user.initials} tone={user.avatarTone} size="sm" />
                    <span className="truncate font-semibold text-slate-950">{user.name}</span>
                    {user.isCurrentUser ? (
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        You
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="truncate px-2 text-slate-600">{user.email}</td>
                <td className="px-2"><UserStatusBadge status={user.status} /></td>
                <td className="px-2"><RoleBadge role={user.role} /></td>
                <td className="truncate px-2 text-slate-700">{user.lastLogin}</td>
                <td className="px-2"><AuthLinkBadge status={user.authLink} /></td>
                <td className="truncate px-2 text-slate-700">{user.createdAt}</td>
                <td className="px-3 text-right">
                  <button type="button" className="rounded p-1 text-slate-600 hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr className="h-[72px]">
                <td colSpan={9} className="px-4 text-center text-[13px] font-medium text-slate-500">
                  No users match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex h-12 items-center px-4 text-[13px] text-slate-600">
        {users.length > 0 ? `1-${users.length}` : "0"} of {totalUsers} users
      </div>
    </section>
  );
}
