import { useMemo, useState } from "react";

import { AdminUsersRolesHeader } from "@/components/admin-users-roles/AdminUsersRolesHeader";
import { AdminUsersRolesSidebar } from "@/components/admin-users-roles/AdminUsersRolesSidebar";
import { AdminUsersTable } from "@/components/admin-users-roles/AdminUsersTable";
import { RolePermissionsMatrix } from "@/components/admin-users-roles/RolePermissionsMatrix";
import { SelectedUserPanel } from "@/components/admin-users-roles/SelectedUserPanel";
import { StatusSummaryCards } from "@/components/admin-users-roles/StatusSummaryCards";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { getErrorMessage } from "@/lib/errors";
import { adminUsers, settingsTabs } from "@/mocks/admin-users-roles";
import type { AdminRole } from "@/types/admin-users-roles";

export function AdminUsersRolesPage() {
  const [users, setUsers] = useState(adminUsers);
  const [selectedUserId, setSelectedUserId] = useState(adminUsers[0].id);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All roles" | AdminRole>("All roles");
  const [activeTab, setActiveTab] = useState<(typeof settingsTabs)[number]>("Users");
  const backend = useAdminSettings();
  const sourceUsers = backend.users.length > 0 ? backend.users : users;

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sourceUsers.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "All roles" || user.role === roleFilter;

      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, sourceUsers]);

  const selectedUser = sourceUsers.find((user) => user.id === selectedUserId) ?? sourceUsers[0];

  const toggleRow = (userId: string) => {
    setSelectedRowIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = visibleUsers.map((user) => user.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRowIds.includes(id));

    setSelectedRowIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const updateUserRole = (userId: string, role: AdminRole) => {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1900px]">
        <AdminUsersRolesSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <AdminUsersRolesHeader activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex min-h-0 flex-1 gap-3 p-3">
            <div className="min-w-0 flex-1 overflow-y-auto pr-0.5">
              <div className="space-y-3">
                {backend.error ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    {getErrorMessage(backend.error)}
                  </div>
                ) : null}
                {backend.isLoading ? (
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                    Loading backend users and roles...
                  </div>
                ) : null}
                <AdminUsersTable
                  users={visibleUsers}
                  totalUsers={sourceUsers.length}
                  query={query}
                  roleFilter={roleFilter}
                  selectedUserId={selectedUser.id}
                  selectedRowIds={selectedRowIds}
                  onQueryChange={setQuery}
                  onRoleFilterChange={setRoleFilter}
                  onSelectUser={setSelectedUserId}
                  onToggleRow={toggleRow}
                  onToggleAll={toggleAllVisible}
                />
                <RolePermissionsMatrix />
                <StatusSummaryCards />
              </div>
            </div>

            <SelectedUserPanel user={selectedUser} onRoleChange={updateUserRole} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminUsersRolesPage;
