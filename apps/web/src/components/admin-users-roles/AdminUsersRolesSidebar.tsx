import { ChevronsLeft, Copy, Hexagon } from "lucide-react";

import { adminNavigationItems, workspaceStats } from "@/mocks/admin-users-roles";

export function AdminUsersRolesSidebar() {
  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col bg-[#0a1c2b] text-slate-100 shadow-xl">
      <div className="flex h-[68px] items-center gap-3 px-6">
        <Hexagon className="h-9 w-9 text-teal-400" strokeWidth={2.4} />
        <span className="text-[20px] font-semibold text-white">ScopeForge</span>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {adminNavigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={[
                "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] font-semibold transition",
                item.active ? "bg-teal-700/80 text-white" : "text-slate-200 hover:bg-white/8 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span
                  className={[
                    "grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-bold text-white",
                    item.danger ? "bg-red-500" : "bg-orange-500",
                  ].join(" ")}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-5">
        <div className="rounded-md border border-white/10 bg-white/5 p-4">
          <p className="text-[13px] font-semibold text-white">{workspaceStats.name}</p>
          <div className="mt-4 space-y-3 text-[12px] text-slate-300">
            <div>
              <div className="text-slate-400">Workspace ID</div>
              <div className="mt-1 flex items-center justify-between gap-2 font-semibold text-slate-100">
                <span>{workspaceStats.workspaceId}</span>
                <Copy className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Plan</span>
              <span className="font-semibold text-white">{workspaceStats.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Members</span>
              <span className="font-semibold text-white">{workspaceStats.members}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mt-7 flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-slate-200 hover:bg-white/8"
        >
          <ChevronsLeft className="h-4 w-4" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
