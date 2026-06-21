import { ChevronDown, MoreHorizontal, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { getNavPath, isNavPathActive } from "@/app/routes";
import type { ReportNavItem } from "@/types/report-builder";

type ReportBuilderSidebarProps = {
  navigation: ReportNavItem[];
};

export function ReportBuilderSidebar({ navigation }: ReportBuilderSidebarProps) {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-[190px] shrink-0 flex-col bg-[#0b1d2a] text-slate-200">
      <div className="flex h-[64px] items-center gap-3 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-teal-300/50 bg-teal-400/10 text-teal-300">
          <Shield className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">ScopeForge</span>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          className="flex h-14 w-full items-center justify-between rounded-md bg-white/10 px-3 text-left transition hover:bg-white/15"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              AC
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">Acme Security</span>
              <span className="block text-xs text-slate-400">Workspace</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const path = getNavPath(item.label);
          const active = path ? isNavPathActive(item.label, location.pathname) : item.active;
          const className = `flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
            active
              ? "bg-teal-500/20 text-teal-50 shadow-[inset_3px_0_0_#2dd4bf]"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`;
          const content = (
            <>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold text-white ${
                    item.danger ? "bg-red-500" : "bg-orange-500"
                  }`}
                >
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

      <div className="p-3">
        <button
          type="button"
          className="flex h-14 w-full items-center justify-between rounded-md border border-white/15 px-3 text-left hover:bg-white/5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-fuchsia-200 text-xs font-bold text-slate-900">
              DA
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">Danish Ali</span>
              <span className="block text-xs text-slate-400">Operator</span>
            </span>
          </span>
          <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>
    </aside>
  );
}
