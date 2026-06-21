import { ChevronDown, ChevronsLeft, Copy, Hexagon, ShieldCheck } from "lucide-react";

import { approvalNavItems, approvalWorkspaceInfo } from "@/mocks/approval-queue";

export function ApprovalSidebar() {
  return (
    <aside className="flex h-screen w-[242px] shrink-0 flex-col bg-[#101f2e] text-slate-100 shadow-xl">
      <div className="flex h-[70px] items-center gap-3 px-5">
        <Hexagon className="h-9 w-9 text-cyan-400" strokeWidth={2.4} />
        <span className="text-[20px] font-semibold tracking-tight text-white">ScopeForge</span>
      </div>

      <div className="px-3 pt-1">
        <button
          type="button"
          className="flex h-[58px] w-full items-center justify-between rounded-lg border border-white/10 bg-white/6 px-3 text-left shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/20 text-slate-100">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">{approvalWorkspaceInfo.name}</span>
              <span className="block text-[11px] text-slate-400">{approvalWorkspaceInfo.owner}</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 px-2">
        {approvalNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={[
                "flex h-[39px] w-full items-center justify-between rounded-md px-3 text-[14px] font-medium transition",
                item.active
                  ? "bg-white/10 text-white shadow-[inset_3px_0_0_#22d3ee]"
                  : "text-slate-300 hover:bg-white/7 hover:text-white",
              ].join(" ")}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-cyan-500 px-1.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-lg border border-white/10 bg-white/6 p-4">
          <div className="text-[12px] font-semibold text-white">{approvalWorkspaceInfo.name}</div>
          <div className="mt-3 text-[11px] text-slate-400">Workspace ID</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] font-semibold text-slate-200">
            <span>{approvalWorkspaceInfo.workspaceId}</span>
            <Copy className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <span>
              Plan
              <span className="mt-1 block text-[12px] font-semibold text-slate-200">{approvalWorkspaceInfo.plan}</span>
            </span>
            <span>
              Members
              <span className="mt-1 block text-[12px] font-semibold text-slate-200">{approvalWorkspaceInfo.members}</span>
            </span>
          </div>
        </div>

        <button type="button" className="mt-5 flex h-8 items-center gap-2 px-2 text-[13px] font-medium text-slate-300">
          <ChevronsLeft className="h-4 w-4" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
