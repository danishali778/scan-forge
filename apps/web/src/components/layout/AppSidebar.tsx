import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  CircleDot,
  Database,
  FileText,
  Folder,
  Hexagon,
  Home,
  ListChecks,
  Settings,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { appRoutes, getNavPath, isNavPathActive } from "@/app/routes";
import { getWorkspace } from "@/api/admin";
import { listApprovals } from "@/api/approvals";
import { pageItems } from "@/lib/apiPages";
import { useCurrentUser } from "@/hooks/useAuth";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  path?: string;
  badge?: number;
};

function initials(value: string | null | undefined, fallback = "SF") {
  const source = value?.trim() || fallback;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  return (parts[0]?.[0] ?? "S").concat(parts[1]?.[0] ?? parts[0]?.[1] ?? "F").toUpperCase();
}

function displayName(email: string | null | undefined) {
  if (!email) {
    return "Workspace user";
  }

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppSidebar() {
  const location = useLocation();
  const currentUser = useCurrentUser();
  const workspace = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const pendingApprovals = useQuery({
    queryKey: ["sidebar", "approvals", "pending"],
    queryFn: () => listApprovals("pending"),
    refetchInterval: 30_000,
  });
  const approvalCount = pageItems(pendingApprovals.data).length;
  const workspaceName = workspace.data?.name ?? "ScopeForge";
  const userName = displayName(currentUser.data?.email);
  const role = currentUser.data?.role ?? "Member";

  const navItems: SidebarItem[] = [
    { label: "Workspace", icon: Home, path: appRoutes.workspace },
    { label: "Projects", icon: Folder, path: appRoutes.projectsNew },
    { label: "Sessions", icon: Activity, path: appRoutes.sessions },
    { label: "Runtime", icon: TerminalSquare, path: appRoutes.runtime },
    { label: "Approvals", icon: ShieldCheck, path: appRoutes.approvals, badge: approvalCount || undefined },
    { label: "Evidence", icon: FileText, path: appRoutes.evidence },
    { label: "Findings", icon: CircleDot, path: appRoutes.evidence },
    { label: "Reports", icon: FileText, path: appRoutes.reports },
    { label: "Memory", icon: Database, path: appRoutes.memory },
    { label: "Analytics", icon: BarChart3, path: appRoutes.analytics },
    { label: "Audit", icon: ListChecks, path: appRoutes.analytics },
    { label: "Settings", icon: Settings, path: appRoutes.settingsUsers },
  ];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[176px] flex-col overflow-hidden bg-[#071927] text-slate-100 shadow-xl">
      <div className="flex h-[42px] items-center gap-2 px-4">
        <Hexagon className="h-6 w-6 text-teal-300" strokeWidth={2.3} />
        <span className="text-[15px] font-semibold tracking-tight text-white">ScopeForge</span>
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          className="flex h-[52px] w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 text-left shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-500/15 text-teal-300">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold text-white">{workspaceName}</span>
              <span className="block text-[10px] text-slate-400">Workspace</span>
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-hidden px-2 pb-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const path = item.path ?? getNavPath(item.label);
          const active =
            item.label === "Findings"
              ? false
              : item.label === "Audit"
                ? false
                : path
                  ? isNavPathActive(item.label, location.pathname)
                  : false;
          const className = [
            "flex h-[36px] w-full items-center justify-between rounded-md px-3 text-left text-[12px] font-semibold transition",
            active ? "bg-teal-700 text-white" : "text-slate-200 hover:bg-white/8 hover:text-white",
          ].join(" ");
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-3">
                <Icon className={active ? "h-4 w-4 shrink-0 text-white" : "h-4 w-4 shrink-0 text-slate-300"} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-400 px-1.5 text-[11px] font-bold text-white">
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

      <div className="border-t border-white/12 p-4">
        <button type="button" className="flex w-full items-center justify-between text-left">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-200 text-[11px] font-bold text-teal-950">
              {initials(currentUser.data?.email)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-white">{userName}</span>
              <span className="block truncate text-[10px] text-slate-400">{role}</span>
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </div>
      </aside>
      <div aria-hidden="true" className="w-[176px] shrink-0" />
    </>
  );
}
