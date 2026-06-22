import { useMemo, useState } from "react";

import { ApprovalDetailsPanel } from "@/components/approval-queue/ApprovalDetailsPanel";
import { ApprovalFilters } from "@/components/approval-queue/ApprovalFilters";
import { ApprovalHeader } from "@/components/approval-queue/ApprovalHeader";
import { ApprovalMetricsPanel } from "@/components/approval-queue/ApprovalMetricsPanel";
import { ApprovalOutcomesPanel } from "@/components/approval-queue/ApprovalOutcomesPanel";
import { ApprovalQueueTable } from "@/components/approval-queue/ApprovalQueueTable";
import { ApprovalSidebar } from "@/components/approval-queue/ApprovalSidebar";
import { useApprovalDecision, useApprovals } from "@/hooks/useApprovals";
import { getErrorMessage } from "@/lib/errors";
import {
  approvalDateRange,
  approvalMetrics,
  approvalRequests,
  approvalRiskSummary,
  approvalTimeSeries,
  recentApprovalOutcomes,
} from "@/mocks/approval-queue";
import type { ApprovalRequest, ApprovalRisk, ApprovalStatus } from "@/types/approval-queue";

const PAGE_SIZE = 6;

type StatusFilter = ApprovalStatus | "all";
type RiskFilter = ApprovalRisk | "all";
type DetailTab = "details" | "scope" | "linked" | "policy" | "audit";

type DecisionFeedback = {
  tone: "info" | "success" | "error";
  message: string;
} | null;

export function ApprovalsPage() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [project, setProject] = useState("all");
  const [requester, setRequester] = useState("all");
  const [selectedId, setSelectedId] = useState(approvalRequests[0].id);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionFeedback, setDecisionFeedback] = useState<DecisionFeedback>(null);
  const [refreshLabel, setRefreshLabel] = useState("Refresh");
  const [mockRequests, setMockRequests] = useState<ApprovalRequest[]>(approvalRequests);
  const approvalsQuery = useApprovals();
  const approvalDecision = useApprovalDecision();
  const backendRequests = approvalsQuery.approvals;
  const requests = backendRequests.length > 0 ? backendRequests : mockRequests;
  const backendRequestIds = useMemo(() => new Set(backendRequests.map((request) => request.id)), [backendRequests]);

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

  const selectedRequest =
    requests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? requests[0];

  const handleSelectRequest = (request: ApprovalRequest) => {
    setSelectedId(request.id);
    setActiveTab("details");
    setDecisionNote("");
    setDecisionFeedback(null);
  };

  const handleRefresh = () => {
    setRefreshLabel("Updated");
    void approvalsQuery.refetch();
    window.setTimeout(() => setRefreshLabel("Refresh"), 1200);
  };

  const handleAskRevision = () => {
    if (selectedRequest.status !== "pending") {
      setDecisionFeedback({ tone: "error", message: "Only pending requests can be revised." });
      return;
    }

    setDecisionFeedback({
      tone: "info",
      message: "Revision requested. The requester will see your note and linked policy context.",
    });
  };

  const handleApplyDecision = (nextStatus: Extract<ApprovalStatus, "approved" | "denied">) => {
    if (selectedRequest.status !== "pending") {
      setDecisionFeedback({ tone: "error", message: "This request already has a final decision." });
      return;
    }

    if (decisionNote.trim().length === 0) {
      setDecisionFeedback({ tone: "error", message: "Add a decision note before approving or denying this request." });
      return;
    }

    if (backendRequestIds.has(selectedRequest.id)) {
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
      return;
    }

    setMockRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === selectedRequest.id
          ? {
              ...request,
              status: nextStatus,
              policyDecision: nextStatus === "approved" ? "allow" : "denied_by_policy",
              age: "just now",
              requestedAt: nextStatus === "approved" ? "Approved just now" : "Denied just now",
            }
          : request,
      ),
    );
    setDecisionFeedback({
      tone: "success",
      message: nextStatus === "approved" ? "Decision recorded. The action can proceed." : "Decision recorded. The action will remain blocked.",
    });
    setDecisionNote("");
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1500px]">
        <ApprovalSidebar />

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
              dateRange={approvalDateRange}
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
                {approvalsQuery.error || approvalDecision.error ? (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    {getErrorMessage(approvalsQuery.error ?? approvalDecision.error)}
                  </div>
                ) : null}
                {approvalsQuery.isLoading ? (
                  <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                    Loading approval queue...
                  </div>
                ) : null}
                <div className="space-y-3">
                  <ApprovalQueueTable
                    requests={filteredRequests}
                    totalCount={requests.length}
                    selectedId={selectedRequest.id}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    onSelectRequest={handleSelectRequest}
                  />

                  <div className="grid grid-cols-[0.92fr_1.08fr] gap-3">
                    <ApprovalOutcomesPanel outcomes={recentApprovalOutcomes} />
                    <ApprovalMetricsPanel
                      metrics={approvalMetrics}
                      riskSummary={approvalRiskSummary}
                      timeSeries={approvalTimeSeries}
                    />
                  </div>
                </div>
              </div>

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
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApprovalsPage;
