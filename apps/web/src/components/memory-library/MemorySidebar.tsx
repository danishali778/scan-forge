import { Aperture, ChevronDown, ChevronsLeft } from "lucide-react";

import { memoryNavItems } from "@/mocks/memory-library";

export function MemorySidebar() {
  return (
    <aside className="flex h-screen w-[252px] shrink-0 flex-col bg-[#081827] text-slate-200">
      <div className="flex h-[86px] items-center gap-3 border-b border-white/10 px-7">
        <Aperture className="h-8 w-8 text-teal-300" />
        <span className="text-xl font-semibold tracking-tight text-white">ScopeForge</span>
      </div>

      <nav className="flex-1 space-y-1 px-2.5 py-5">
        {memoryNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={`flex h-12 w-full items-center gap-3 rounded-md px-4 text-left text-sm font-medium transition ${
                item.active
                  ? "bg-teal-600/75 text-white shadow-[inset_3px_0_0_#5eead4]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="grid h-5 min-w-5 place-items-center rounded border border-amber-400/60 px-1.5 text-xs font-semibold text-amber-300">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button type="button" className="flex h-12 w-full items-center gap-3 rounded-md px-4 text-left hover:bg-white/5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-600 text-xs font-bold text-white">
            DA
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">Danish Ali</span>
            <span className="block truncate text-xs text-slate-400">Operator</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <button
        type="button"
        className="grid h-12 place-items-end border-t border-white/10 px-5 text-slate-400 hover:text-white"
        aria-label="Collapse sidebar"
      >
        <ChevronsLeft className="h-5 w-5" />
      </button>
    </aside>
  );
}
