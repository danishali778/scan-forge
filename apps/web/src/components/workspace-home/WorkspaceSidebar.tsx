import { ChevronDown, ChevronsLeft, Hexagon } from "lucide-react";

import type { WorkspaceNavItem } from "@/types/workspace-home";

interface WorkspaceSidebarProps {
  items: WorkspaceNavItem[];
  workspaceName: string;
  initials: string;
}

export function WorkspaceSidebar({ items, workspaceName, initials }: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-screen w-[180px] shrink-0 flex-col bg-[#071d2b] text-slate-200">
      <div className="flex h-[58px] items-center gap-2 px-4">
        <Hexagon className="h-7 w-7 text-teal-300" strokeWidth={2.4} />
        <span className="text-[17px] font-semibold tracking-tight text-white">ScopeForge</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={[
                "flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-semibold transition",
                item.active ? "bg-teal-500/25 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-[17px] w-[17px]" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-slate-950">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-md px-1.5 text-left hover:bg-white/10"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-teal-400 text-[12px] font-bold text-white">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-white">{workspaceName}</span>
              <span className="block text-[11px] text-slate-300">Owner</span>
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        <button type="button" className="mt-5 flex h-8 items-center gap-2 px-3 text-[12px] text-slate-300">
          <ChevronsLeft className="h-4 w-4" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
