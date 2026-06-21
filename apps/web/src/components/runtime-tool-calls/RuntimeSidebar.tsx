import {
  Activity,
  BarChart3,
  ChevronDown,
  Database,
  FileSearch,
  FileText,
  Folder,
  HelpCircle,
  Hexagon,
  Home,
  ListChecks,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { getNavPath, isNavPathActive } from "@/app/routes";
import type { RuntimeToolCallsData } from "@/types/runtime-tool-calls";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  danger?: boolean;
};

const sidebarItems: SidebarItem[] = [
  { label: "Workspace", icon: Home },
  { label: "Projects", icon: Folder },
  { label: "Sessions", icon: Activity },
  { label: "Runtime", icon: SquareTerminal, active: true },
  { label: "Approvals", icon: ShieldCheck, badge: 3 },
  { label: "Evidence", icon: FileSearch },
  { label: "Findings", icon: ShieldAlert, badge: 7, danger: true },
  { label: "Reports", icon: FileText },
  { label: "Memory", icon: Database },
  { label: "Analytics", icon: BarChart3 },
  { label: "Audit", icon: ListChecks },
  { label: "Settings", icon: Settings },
];

export function RuntimeSidebar({ data }: { data: Pick<RuntimeToolCallsData, "workspaceName" | "userName" | "userEmail"> }) {
  const location = useLocation();
  const initials = data.userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-screen w-[244px] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800">
      <div className="flex h-[72px] items-center gap-3 px-6">
        <Hexagon className="h-8 w-8 text-teal-600" strokeWidth={2.4} />
        <span className="text-[19px] font-semibold tracking-tight text-slate-950">ScopeForge</span>
      </div>

      <div className="px-4">
        <button
          type="button"
          className="flex min-h-[64px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-left shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-slate-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950">{data.workspaceName}</span>
              <span className="block text-xs text-slate-500">Workspace</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 px-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const path = getNavPath(item.label);
          const active = path ? isNavPathActive(item.label, location.pathname) : item.active;
          const className = [
            "flex h-11 w-full items-center justify-between rounded-md px-3 text-sm font-semibold transition",
            active ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50",
          ].join(" ");
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-3">
                <Icon className={active ? "h-5 w-5 text-teal-700" : "h-5 w-5 text-slate-500"} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <span
                  className={[
                    "grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-bold text-white",
                    item.danger ? "bg-red-500" : "bg-amber-400 text-slate-900",
                  ].join(" ")}
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
            <button type="button" key={item.label} className={className}>
              {content}
            </button>
          );
        })}
      </nav>

      <div className="space-y-4 p-4">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">Need help?</div>
          <button type="button" className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
            View docs
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          className="flex min-h-[56px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-left shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950">{data.userName}</span>
              <span className="block truncate text-xs text-slate-500">{data.userEmail}</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </div>
    </aside>
  );
}
