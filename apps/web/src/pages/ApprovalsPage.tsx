import { useEffect, useMemo, useState } from "react";

import { ApprovalDetailsPanel } from "@/components/approval-queue/ApprovalDetailsPanel";
import { ApprovalFilters } from "@/components/approval-queue/ApprovalFilters";
import { ApprovalHeader } from "@/components/approval-queue/ApprovalHeader";
import { ApprovalMetricsPanel } from "@/components/approval-queue/ApprovalMetricsPanel";
import { ApprovalOutcomesPanel } from "@/components/approval-queue/ApprovalOutcomesPanel";
import { ApprovalQueueTable } from "@/components/approval-queue/ApprovalQueueTable";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useApprovalAnalytics, useApprovalDecision, useApprovals } from "@/hooks/useApprovals";
import { getErrorMessage } from "@/lib/errors";
import type { ApiAnalyticsApprovals } from "@/types/analytics-audit";
import type {
  ApprovalMetric,
  ApprovalOutcome,
  ApprovalRequest,
  ApprovalRisk,
  ApprovalRiskSummary,
  ApprovalStatus,
} from "@/types/approval-queue";

const PAGE_SIZE = 6;

type StatusFilter = ApprovalStatus | "all";
type RiskFilter = ApprovalRisk | "all";
type DetailTab = "details" | "scope" | "linked" | "policy" | "audit";

type DecisionFeedback = {
  tone: "info" | "success" | "error";
  message: string;
} | null;

const APPROVAL_WINDOW_DAYS = 30;
const TIME_SERIES_DAYS = 14;
const riskOrder: ApprovalRisk[] = ["high", "medium", "low"];

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function approvalDateRangeLabel() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - APPROVAL_WINDOW_DAYS + 1);

  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) {
    return "--";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function buildApprovalMetrics(requests: ApprovalRequest[], analytics: ApiAnalyticsApprovals | undefined): ApprovalMetric[] {
  const countStatus = (status: ApprovalStatus) => requests.filter((request) => request.status === status).length;
  const total = analytics?.total ?? requests.length;
  const pending = analytics?.pending_count ?? countStatus("pending");
  const approved = analytics?.approved_count ?? countStatus("approved");
  const denied = analytics?.denied_count ?? countStatus("denied");
  const expired = countStatus("expired");

  return [
    { label: "Pending", value: String(pending), helper: `${total} total`, trend: pending > 0 ? "up" : "down" },
    { label: "Approved", value: String(approved), helper: "resolved actions", trend: "up" },
    { label: "Denied", value: String(denied), helper: "blocked actions", trend: denied > 0 ? "up" : "down" },
    { label: "Expired", value: String(expired), helper: "timed out", trend: expired > 0 ? "up" : "down" },
  ];
}

function buildRiskSummary(requests: ApprovalRequest[]): ApprovalRiskSummary[] {
  const total = requests.length;

  return riskOrder.map((risk) => {
    const count = requests.filter((request) => request.risk === risk).length;

    return {
      risk,
      label: risk.charAt(0).toUpperCase() + risk.slice(1),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

function buildRecentOutcomes(requests: ApprovalRequest[]): ApprovalOutcome[] {
  return requests
    .filter((request) => request.status === "approved" || request.status === "denied" || request.status === "expired")
    .slice(0, 5)
    .map((request) => ({
      id: request.id,
      status: request.status,
      title: request.requestTitle,
      sessionId: request.sessionId,
      requester: request.requester.name,
      age: request.age,
    }));
}

function buildApprovalTimeSeries(requests: ApprovalRequest[]) {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - TIME_SERIES_DAYS + 1);
  const buckets = Array.from({ length: TIME_SERIES_DAYS }, () => 0);

  requests.forEach((request) => {
    if (!request.createdAt) {
      return;
    }

    const created = startOfDay(new Date(request.createdAt));
    const index = Math.floor((created.getTime() - start.getTime()) / 86_400_000);

    if (index >= 0 && index < buckets.length) {
      buckets[index] += 1;
    }
  });

  const max = Math.max(...buckets, 1);

  return {
    values: buckets.map((value) => (value > 0 ? Math.round((value / max) * 100) : 0)),
    startLabel: formatShortDate(start),
    endLabel: formatShortDate(end),
  };
}

function EmptyApprovalDetailsPanel() {
  return (
    <aside className="flex w-[500px] shrink-0 flex-col rounded-tl-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-[48px] shrink-0 items-center border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Approval request</h2>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center px-8 text-center">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-950">No approval selected</h3>
          <p className="mt-2 text-[13px] leading-6 text-slate-500">
            Backend approval requests from policy-gated agent actions will appear here.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function ApprovalsPage() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [project, setProject] = useState("all");
  const [requester, setRequester] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionFeedback, setDecisionFeedback] = useState<DecisionFeedback>(null);
  const [refreshLabel, setRefreshLabel] = useState("Refresh");
  const approvalsQuery = useApprovals(status);
  const approvalAnalytics = useApprovalAnalytics();
  const approvalDecision = useApprovalDecision();
  const requests = approvalsQuery.approvals;

  const projects = useMemo(() => Array.from(new Set(requests.map((request) => request.project))).sort(), [requests]);
  const requesters = useMemo(
    () => Array.from(new Set(requests.map((request) => request.requester.name))).sort(),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus = status === "all" || request.status === status;
      const matchesRisk = risk === "all" || request.risk === risk;
      const matchesProject = project === "all" || request.project === project;
      const matchesRequester = requester === "all" || request.requester.name === requester;
      const matchesSearch =
        query.length === 0 ||
        request.requestTitle.toLowerCase().includes(query) ||
        request.requestDetail.toLowerCase().includes(query) ||
        request.sessionId.toLowerCase().includes(query) ||
        request.sessionName.toLowerCase().includes(query) ||
        request.actionType.toLowerCase().includes(query) ||
        request.requester.name.toLowerCase().includes(query);

      return matchesStatus && matchesRisk && matchesProject && matchesRequester && matchesSearch;
    });
  }, [globalSearch, project, requester, requests, risk, status]);

  useEffect(() => {
    const selectedIsVisible = filteredRequests.some((request) => request.id === selectedId);
    const nextSelectedId = selectedIsVisible ? selectedId : (filteredRequests[0]?.id ?? "");

    if (selectedId !== nextSelectedId) {
      setSelectedId(nextSelectedId);
      setActiveTab("details");
      setDecisionNote("");
      setDecisionFeedback(null);
    }
  }, [filteredRequests, selectedId]);

  const selectedRequest =
    requests.find((request) => request.id === selectedId) ?? filteredRequests[0];
  const metrics = useMemo(
    () => buildApprovalMetrics(requests, approvalAnalytics.data),
    [approvalAnalytics.data, requests],
  );
  const riskSummary = useMemo(() => buildRiskSummary(requests), [requests]);
  const recentOutcomes = useMemo(() => buildRecentOutcomes(requests), [requests]);
  const timeSeries = useMemo(() => buildApprovalTimeSeries(requests), [requests]);
  const dateRangeLabel = useMemo(() => approvalDateRangeLabel(), []);

  const handleSelectRequest = (request: ApprovalRequest) => {
    setSelectedId(request.id);
    setActiveTab("details");
    setDecisionNote("");
    setDecisionFeedback(null);
  };

  const handleRefresh = () => {
    setRefreshLabel("Updated");
    void approvalsQuery.refetch();
    void approvalAnalytics.refetch();
    window.setTimeout(() => setRefreshLabel("Refresh"), 1200);
  };

  const handleAskRevision = () => {
    if (!selectedRequest) {
      return;
    }

    setDecisionFeedback({
      tone: "info",
      message: "Revision requests are not exposed by the backend yet.",
    });
  };

  const handleApplyDecision = (nextStatus: Extract<ApprovalStatus, "approved" | "denied">) => {
    if (!selectedRequest) {
      return;
    }

    if (selectedRequest.status !== "pending") {
      setDecisionFeedback({ tone: "error", message: "This request already has a final decision." });
      return;
    }

    if (decisionNote.trim().length === 0) {
      setDecisionFeedback({ tone: "error", message: "Add a decision note before approving or denying this request." });
      return;
    }

    const mutation = nextStatus === "approved" ? approvalDecision.approve : approvalDecision.deny;

    mutation.mutate(
      {
        approvalId: selectedRequest.id,
        request: { note: decisionNote },
      },
      {
        onSuccess: () => {
          setDecisionFeedback({
            tone: "success",
            message: nextStatus === "approved" ? "Decision recorded. The action can proceed." : "Decision recorded. The action will remain blocked.",
          });
          setDecisionNote("");
        },
        onError: (error) => {
          setDecisionFeedback({ tone: "error", message: getErrorMessage(error) });
        },
      },
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1500px]">
        <AppSidebar />

        <main className="flex min-w-0 flex-1 flex-col bg-[#fbfcfd]">
          <ApprovalHeader globalSearch={globalSearch} onGlobalSearchChange={setGlobalSearch} />

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
            <ApprovalFilters
              status={status}
              risk={risk}
              project={project}
              requester={requester}
              projects={projects}
              requesters={requesters}
              dateRange={dateRangeLabel}
              refreshLabel={refreshLabel}
              onStatusChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              onRiskChange={(value) => {
                setRisk(value);
                setPage(1);
              }}
              onProjectChange={(value) => {
                setProject(value);
                setPage(1);
              }}
              onRequesterChange={(value) => {
                setRequester(value);
                setPage(1);
              }}
              onRefresh={handleRefresh}
            />

            <div className="mt-3 flex min-h-0 flex-1 gap-3">
              <div className="min-w-0 flex-1 overflow-y-auto pb-1">
                {approvalsQuery.error || approvalAnalytics.error || approvalDecision.error ? (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    {getErrorMessage(approvalsQuery.error ?? approvalAnalytics.error ?? approvalDecision.error)}
                  </div>
                ) : null}
                {approvalsQuery.isLoading || approvalAnalytics.isLoading ? (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                    Loading approval queue...
                  </div>
                ) : null}
                <div className="space-y-3">
                  <ApprovalQueueTable
                    requests={filteredRequests}
                    totalCount={requests.length}
                    selectedId={selectedRequest?.id ?? ""}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    onSelectRequest={handleSelectRequest}
                  />

                  <div className="grid grid-cols-[0.92fr_1.08fr] gap-3">
                    <ApprovalOutcomesPanel outcomes={recentOutcomes} />
                    <ApprovalMetricsPanel
                      metrics={metrics}
                      riskSummary={riskSummary}
                      timeSeries={timeSeries.values}
                      averageResolutionLabel={formatDuration(approvalAnalytics.data?.average_resolution_seconds)}
                      dateRangeLabel={dateRangeLabel}
                      timeSeriesStartLabel={timeSeries.startLabel}
                      timeSeriesEndLabel={timeSeries.endLabel}
                    />
                  </div>
                </div>
              </div>

              {selectedRequest ? (
                <ApprovalDetailsPanel
                  request={selectedRequest}
                  activeTab={activeTab}
                  decisionNote={decisionNote}
                  feedback={decisionFeedback}
                  onTabChange={setActiveTab}
                  onDecisionNoteChange={setDecisionNote}
                  onAskRevision={handleAskRevision}
                  onApplyDecision={handleApplyDecision}
                  isDecisionPending={approvalDecision.isPending}
                  canAskRevision={false}
                />
              ) : (
                <EmptyApprovalDetailsPanel />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApprovalsPage;
