import { CalendarDays, Plus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { appRoutes } from "@/app/routes";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ActiveSessionsPanel } from "@/components/workspace-home/ActiveSessionsPanel";
import { ApprovalRequestPanel } from "@/components/workspace-home/ApprovalRequestPanel";
import { AttentionQueuePanel } from "@/components/workspace-home/AttentionQueuePanel";
import { RecentActivityPanel } from "@/components/workspace-home/RecentActivityPanel";
import { WorkspaceMetricsStrip } from "@/components/workspace-home/WorkspaceMetricsStrip";
import { WorkspaceSetupPanel } from "@/components/workspace-home/WorkspaceSetupPanel";
import { WorkspaceTopBar } from "@/components/workspace-home/WorkspaceTopBar";
import { useApprovalDecision } from "@/hooks/useApprovals";
import { useWorkspaceHome } from "@/hooks/useWorkspaceHome";

export function WorkspaceHomePage() {
  const workspace = useWorkspaceHome();
  const approvalDecision = useApprovalDecision();

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceTopBar
            workspaceName={workspace.workspaceName}
            role={workspace.userRole}
            userName={workspace.userName}
            initials={workspace.userInitials}
          />

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
                    {workspace.dateRangeLabel}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={workspace.refetch}
                  className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${workspace.isLoading ? "animate-spin" : ""}`} />
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

            {workspace.error ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                {workspace.error.message}
              </div>
            ) : null}
            {workspace.isLoading ? (
              <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700">
                Loading workspace activity...
              </div>
            ) : null}

            <div className="flex min-h-0 flex-col gap-3 pb-6">
              <WorkspaceMetricsStrip metrics={workspace.metrics} />

              <div className="grid h-[500px] min-h-0 grid-cols-[minmax(560px,1.42fr)_minmax(350px,0.92fr)_340px] items-stretch gap-3">
                <div className="min-h-0 self-stretch">
                  <ActiveSessionsPanel sessions={workspace.workspaceSessions} />
                </div>

                <div className="flex min-h-0 flex-col gap-3 self-stretch">
                  <AttentionQueuePanel groups={workspace.attentionGroups} className="flex-1" />
                  <WorkspaceSetupPanel items={workspace.setupItems} />
                </div>

                <ApprovalRequestPanel
                  request={workspace.approvalRequest}
                  isResolving={approvalDecision.isPending}
                  onApprove={(note) =>
                    workspace.approvalRequest
                      ? approvalDecision.approve.mutate(
                          { approvalId: workspace.approvalRequest.requestId, request: { note } },
                          { onSuccess: workspace.refetch },
                        )
                      : undefined
                  }
                  onDeny={(note) =>
                    workspace.approvalRequest
                      ? approvalDecision.deny.mutate(
                          { approvalId: workspace.approvalRequest.requestId, request: { note } },
                          { onSuccess: workspace.refetch },
                        )
                      : undefined
                  }
                />
              </div>

              <RecentActivityPanel items={workspace.activityItems} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceHomePage;
