import { ChevronsLeft } from "lucide-react";

import { sessionNavItems } from "@/mocks/session-command";

export function SessionCommandSidebar() {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col bg-[#0a1d2b] text-slate-200">
      <div className="flex h-[64px] items-center gap-3 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-teal-400/15 text-teal-300">
          <span className="text-xl font-black leading-none">S</span>
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">ScopeForge</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {sessionNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
                item.active
                  ? "bg-teal-500/20 text-teal-100 shadow-[inset_3px_0_0_#2dd4bf]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-slate-950">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/15 p-3">
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-slate-300 hover:bg-white/5"
        >
          <ChevronsLeft className="h-4 w-4" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
