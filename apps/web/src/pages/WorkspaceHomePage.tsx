import { CalendarDays, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { appRoutes } from "@/app/routes";
import { ActiveSessionsPanel } from "@/components/workspace-home/ActiveSessionsPanel";
import { ApprovalRequestPanel } from "@/components/workspace-home/ApprovalRequestPanel";
import { AttentionQueuePanel } from "@/components/workspace-home/AttentionQueuePanel";
import { RecentActivityPanel } from "@/components/workspace-home/RecentActivityPanel";
import { WorkspaceMetricsStrip } from "@/components/workspace-home/WorkspaceMetricsStrip";
import { WorkspaceSetupPanel } from "@/components/workspace-home/WorkspaceSetupPanel";
import { WorkspaceSidebar } from "@/components/workspace-home/WorkspaceSidebar";
import { WorkspaceTopBar } from "@/components/workspace-home/WorkspaceTopBar";
import {
  activityItems,
  approvalRequest,
  attentionGroups,
  selectedWorkspace,
  workspaceMetrics,
  workspaceNavItems,
  workspaceSessions,
  workspaceSetupItems,
} from "@/mocks/workspace-home";

export function WorkspaceHomePage() {
  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <WorkspaceSidebar
          items={workspaceNavItems}
          workspaceName={selectedWorkspace.name}
          initials={selectedWorkspace.initials}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceTopBar
            workspaceName={selectedWorkspace.name}
            role={selectedWorkspace.role}
            userName={selectedWorkspace.userName}
          />

          <main className="min-h-0 flex-1 overflow-hidden px-5 py-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-950">Workspace</h1>
                <p className="mt-0.5 text-[13px] text-slate-600">
                  Operational overview of activity, alerts, and what needs your attention.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-9 min-w-[240px] items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-600" />
                    May 20, 2026 - Jun 19, 2026
                  </span>
                </button>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <Link
                  to={appRoutes.projectsNew}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" />
                  New project
                </Link>
              </div>
            </div>

            <div className="flex h-[calc(100%-66px)] min-h-0 flex-col gap-3">
              <WorkspaceMetricsStrip metrics={workspaceMetrics} />

              <div className="grid min-h-0 flex-1 grid-cols-[minmax(560px,1.42fr)_minmax(350px,0.92fr)_340px] gap-3">
                <div className="min-h-0 space-y-3 overflow-hidden">
                  <ActiveSessionsPanel sessions={workspaceSessions} />
                  <RecentActivityPanel items={activityItems} />
                </div>

                <div className="min-h-0 space-y-3 overflow-y-auto">
                  <AttentionQueuePanel groups={attentionGroups} />
                  <WorkspaceSetupPanel items={workspaceSetupItems} />
                </div>

                <ApprovalRequestPanel request={approvalRequest} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceHomePage;
