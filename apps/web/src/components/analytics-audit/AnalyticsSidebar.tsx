import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { getNavPath, isNavPathActive } from "@/app/routes";
import { analyticsNavigation } from "@/mocks/analytics-audit";

export function AnalyticsSidebar() {
  const location = useLocation();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col bg-[#071927] px-4 py-5 text-white">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-teal-500/15 text-teal-300">
          <span className="text-xl font-black">S</span>
        </div>
        <span className="text-xl font-bold tracking-tight">ScopeForge</span>
      </div>

      <nav className="mt-7 space-y-1 border-t border-white/10 pt-4">
        {analyticsNavigation.map((item) => {
          const Icon = item.icon;
          const path = getNavPath(item.label);
          const active = path ? isNavPathActive(item.label, location.pathname) : item.active;
          const className = [
            "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold",
            active ? "bg-teal-700 text-white" : "text-slate-200 hover:bg-white/10",
          ].join(" ");
          const content = (
            <>
              <Icon className="h-4 w-4" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-bold text-white",
                    item.danger ? "bg-red-500" : "bg-amber-500",
                  ].join(" ")}
                >
                  {item.badge}
                </span>
              ) : null}
            </>
          );

          return (
            path ? (
              <Link key={item.label} to={path} className={className}>
                {content}
              </Link>
            ) : (
              <button
              key={item.label}
              type="button"
              className={className}
              >
                {content}
              </button>
            )
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <button className="flex w-full items-center gap-3 rounded-md border border-white/15 bg-white/5 p-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-white">AL</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Acme Security Lab</span>
            <span className="block text-xs text-slate-300">Workspace</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-300" />
        </button>
        <button className="flex w-full items-center gap-3 rounded-md border border-white/15 bg-white/5 p-3 text-left">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-700 text-xs font-bold">DA</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Danish Ali</span>
            <span className="block text-xs text-slate-300">Reviewer</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    </aside>
  );
}
