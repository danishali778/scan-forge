import { Building2, ChevronDown, ChevronsLeft, Hexagon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { getNavPath, isNavPathActive } from "@/app/routes";
import { sessionsListNavItems } from "@/mocks/sessions-list";

export function SessionsListSidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col bg-[#101f2e] text-slate-100 shadow-xl">
      <div className="flex h-[72px] items-center gap-3 px-6">
        <Hexagon className="h-9 w-9 text-teal-400" strokeWidth={2.3} />
        <span className="text-[20px] font-semibold">ScopeForge</span>
      </div>

      <div className="px-5 pt-2">
        <button
          type="button"
          className="flex h-14 w-full items-center justify-between rounded-md border border-slate-600/80 bg-slate-900/30 px-3 text-left shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-teal-400/15 text-teal-300">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">Acme Security</span>
              <span className="block text-[11px] text-slate-400">Workspace</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
        </button>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {sessionsListNavItems.map((item) => {
          const Icon = item.icon;
          const path = getNavPath(item.label);
          const active = path ? isNavPathActive(item.label, location.pathname) : item.active;
          const className = [
            "flex h-11 w-full items-center justify-between rounded-md px-3 text-[14px] font-medium transition",
            active
              ? "bg-teal-700/70 text-white shadow-[inset_3px_0_0_#2dd4bf]"
              : "text-slate-200 hover:bg-white/8 hover:text-white",
          ].join(" ");
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </>
          );

          return path ? (
            <Link key={item.label} to={path} className={className}>
              {content}
            </Link>
          ) : (
            <button key={item.label} type="button" className={className}>
              {content}
            </button>
          );
        })}
      </nav>

      <div className="px-5 pb-5">
        <div className="mb-5 border-t border-white/16" />
        <button type="button" className="flex w-full items-center justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-200 text-sm font-bold text-teal-900">
              DA
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[14px] font-semibold text-white">Daniyal Ali</span>
              <span className="block text-[12px] text-slate-300">Operator</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
        </button>

        <button type="button" className="mt-7 flex items-center gap-2 text-[13px] text-slate-300">
          <ChevronsLeft className="h-4 w-4" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
