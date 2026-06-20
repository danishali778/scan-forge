import {
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardCheck,
  FileText,
  SquareTerminal,
} from "lucide-react";

import { ApprovalRiskBadge, ApprovalStatusBadge } from "@/components/approval-queue/ApprovalBadges";
import type { ApprovalActionKind, ApprovalPolicyDecision, ApprovalRequest, ApprovalUserColor } from "@/types/approval-queue";

type ApprovalQueueTableProps = {
  requests: ApprovalRequest[];
  totalCount: number;
  selectedId: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSelectRequest: (request: ApprovalRequest) => void;
};

const actionIcons = {
  terminal: SquareTerminal,
  file: FileText,
  memory: Brain,
  report: ClipboardCheck,
} satisfies Record<ApprovalActionKind, typeof SquareTerminal>;

const requesterStyles: Record<ApprovalUserColor, string> = {
  slate: "bg-slate-900 text-white",
  teal: "bg-teal-700 text-white",
  blue: "bg-slate-800 text-white",
  violet: "bg-slate-800 text-white",
};

const policyLabels: Record<ApprovalPolicyDecision, string> = {
  require_approval: "Require approval",
  allow: "Allow",
  allow_candidate: "Allow (candidate)",
  denied_by_policy: "Denied by policy",
};

export function ApprovalQueueTable({
  requests,
  totalCount,
  selectedId,
  page,
  pageSize,
  onPageChange,
  onSelectRequest,
}: ApprovalQueueTableProps) {
  const maxPage = Math.max(1, Math.ceil(requests.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const visibleRequests = requests.slice(startIndex, startIndex + pageSize);
  const showingStart = requests.length > 0 ? startIndex + 1 : 0;
  const showingEnd = Math.min(startIndex + pageSize, requests.length);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[16px] font-semibold text-slate-950">Approval queue ({totalCount})</h2>
      </div>

      <table className="w-full table-fixed border-collapse text-left text-[13px]">
        <thead className="h-11 bg-slate-50/70 text-[12px] font-semibold text-slate-600">
          <tr>
            <th className="w-[188px] px-3">Request</th>
            <th className="w-[142px] px-3">Session</th>
            <th className="w-[124px] px-3">Action type</th>
            <th className="w-[76px] px-3">Risk</th>
            <th className="w-[136px] px-3">Policy decision</th>
            <th className="w-[128px] px-3">Requested by</th>
            <th className="w-[70px] px-3">Age</th>
            <th className="w-[88px] px-3">
              <span className="inline-flex items-center gap-1">
                Status
                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {visibleRequests.map((request) => {
            const Icon = actionIcons[request.actionKind];
            const selected = selectedId === request.id;

            return (
              <tr
                key={request.id}
                className={[
                  "h-[62px] cursor-pointer transition",
                  selected ? "bg-sky-50/70 shadow-[inset_3px_0_0_#93c5fd]" : "bg-white hover:bg-slate-50",
                ].join(" ")}
                onClick={() => onSelectRequest(request)}
              >
                <td className="px-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-slate-700 text-white">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{request.requestTitle}</span>
                      <span className="block truncate text-[12px] text-slate-500">{request.requestDetail}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3">
                  <div className="truncate font-medium text-blue-700">{request.sessionId}</div>
                  <div className="truncate text-[12px] text-slate-500">{request.sessionName}</div>
                </td>
                <td className="truncate px-3 font-mono text-[12px] text-slate-700">{request.actionType}</td>
                <td className="px-3">
                  <ApprovalRiskBadge risk={request.risk} />
                </td>
                <td className="truncate px-3 text-slate-700">{policyLabels[request.policyDecision]}</td>
                <td className="px-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${requesterStyles[request.requester.color]}`}>
                      {request.requester.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-slate-800">{request.requester.name}</span>
                      <span className="block truncate text-[11px] text-slate-500">{request.requester.role}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 text-slate-600">{request.age}</td>
                <td className="px-3">
                  <ApprovalStatusBadge status={request.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex h-[54px] items-center justify-between border-t border-slate-200 px-4 text-[13px] text-slate-600">
        <span>
          {showingStart}-{showingEnd} of {requests.length || totalCount}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-45"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-8 min-w-8 place-items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-[13px] font-semibold text-blue-700"
          >
            {page}
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-45"
            disabled={page >= maxPage}
            onClick={() => onPageChange(Math.min(maxPage, page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
