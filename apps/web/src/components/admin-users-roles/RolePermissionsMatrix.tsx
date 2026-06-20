import { Info } from "lucide-react";

import { PermissionCell } from "@/components/admin-users-roles/AdminUsersRolesBadges";
import { permissionMatrixRows, roleOptions } from "@/mocks/admin-users-roles";

export function RolePermissionsMatrix() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[18px] font-semibold text-slate-950">Role permissions matrix</h2>
        <Info className="h-4 w-4 text-slate-400" />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full table-fixed text-left text-[12px]">
          <thead className="h-10 bg-slate-50 text-slate-950">
            <tr>
              <th className="w-[180px] px-4 font-semibold">Permission area</th>
              <th className="w-[280px] px-4 font-semibold">Permission</th>
              {roleOptions.map((role) => (
                <th key={role} className="w-[118px] px-3 text-center font-semibold">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {permissionMatrixRows.map((row) => {
              const Icon = row.icon;

              return (
                <tr key={row.area} className="h-[34px]">
                  <td className="px-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <Icon className="h-4 w-4 text-slate-600" />
                      {row.area}
                    </div>
                  </td>
                  <td className="truncate px-4 text-slate-700">{row.permission}</td>
                  {roleOptions.map((role) => (
                    <td key={role} className="border-l border-slate-100 px-3 text-center">
                      <PermissionCell grant={row.grants[role]} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
