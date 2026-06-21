import {
  ChevronDown,
  Copy,
  ExternalLink,
  Lock,
  MessageSquarePlus,
  ShieldX,
  SquareTerminal,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { ApprovalRiskBadge, ApprovalStatusBadge } from "@/components/approval-queue/ApprovalBadges";
import type { ApprovalRequest, ApprovalStatus, ApprovalUserColor } from "@/types/approval-queue";

type DetailTab = "details" | "scope" | "linked" | "policy" | "audit";

type DecisionFeedback = {
  tone: "info" | "success" | "error";
  message: string;
} | null;

type ApprovalDetailsPanelProps = {
  request: ApprovalRequest;
  activeTab: DetailTab;
  decisionNote: string;
  feedback: DecisionFeedback;
  onTabChange: (tab: DetailTab) => void;
  onDecisionNoteChange: (value: string) => void;
  onAskRevision: () => void;
  onApplyDecision: (status: Extract<ApprovalStatus, "approved" | "denied">) => void;
};

const tabs: { key: DetailTab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "scope", label: "Scope" },
  { key: "linked", label: "Linked" },
  { key: "policy", label: "Policy" },
  { key: "audit", label: "Audit trail" },
];

const requesterStyles: Record<ApprovalUserColor, string> = {
  slate: "bg-slate-900 text-white",
  teal: "bg-teal-700 text-white",
  blue: "bg-slate-800 text-white",
  violet: "bg-slate-800 text-white",
};

const feedbackStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

export function ApprovalDetailsPanel({
  request,
  activeTab,
  decisionNote,
  feedback,
  onTabChange,
  onDecisionNoteChange,
  onAskRevision,
  onApplyDecision,
}: ApprovalDetailsPanelProps) {
  const decisionLocked = request.status !== "pending";

  return (
    <aside className="flex w-[500px] shrink-0 flex-col rounded-tl-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-[48px] shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Approval request</h2>
        <div className="flex items-center gap-2 text-slate-500">
          <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100" aria-label="Collapse panel">
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
          <button type="button" className="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100" aria-label="Close panel">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-slate-700 text-white">
                <SquareTerminal className="h-4 w-4" />
              </span>
              <h3 className="min-w-0 truncate text-[15px] font-semibold text-slate-950">
                {request.requestTitle} {request.requestDetail}
              </h3>
            </div>
            <ApprovalRiskBadge risk={request.risk} />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <ApprovalStatusBadge status={request.status} />
            <span className="text-[12px] font-medium text-slate-500">{request.requestedAt}</span>
          </div>
        </div>

        <div className="mt-4 flex h-10 border-b border-slate-200 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={[
                "relative mr-6 h-10 text-[13px] font-semibold transition",
                activeTab === tab.key ? "text-teal-700" : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
              {activeTab === tab.key ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" /> : null}
            </button>
          ))}
        </div>

        <div className="px-4 py-4">
          {activeTab === "details" ? <DetailsTab request={request} /> : null}
          {activeTab === "scope" ? <ScopeTab request={request} /> : null}
          {activeTab === "linked" ? <LinkedTab request={request} /> : null}
          {activeTab === "policy" ? <PolicyTab request={request} /> : null}
          {activeTab === "audit" ? <AuditTab request={request} /> : null}

          <PanelSection title="Decision">
            {decisionLocked ? (
              <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                This request is already {request.status}. New actions are disabled for audit integrity.
              </div>
            ) : null}

            <label className="block text-[12px] font-medium text-slate-500">
              Add a decision note (required)
              <textarea
                value={decisionNote}
                onChange={(event) => onDecisionNoteChange(event.target.value)}
                placeholder="Explain your decision..."
                className="mt-2 h-[66px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500"
              />
            </label>

            {feedback ? (
              <div className={`mt-2 rounded-md border px-3 py-2 text-[12px] font-medium ${feedbackStyles[feedback.tone]}`}>
                {feedback.message}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-[1fr_1fr_1fr] gap-3">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onAskRevision}
                disabled={decisionLocked}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Ask for revision
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-[13px] font-semibold text-white shadow-sm shadow-teal-900/15 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onApplyDecision("approved")}
                disabled={decisionLocked}
              >
                <SquareTerminal className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-[13px] font-semibold text-white shadow-sm shadow-red-900/15 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onApplyDecision("denied")}
                disabled={decisionLocked}
              >
                <ShieldX className="h-4 w-4" />
                Deny
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-slate-500">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This action is CSRF-protected. Your session will be verified before applying any decision.</span>
            </div>
          </PanelSection>
        </div>
      </div>
    </aside>
  );
}

function DetailsTab({ request }: { request: ApprovalRequest }) {
  return (
    <>
      <PanelSection title="Requested action">
        <DetailRow label="Action type">{request.action.actionType}</DetailRow>
        <DetailRow label="Command">
          <span className="inline-flex max-w-full items-center gap-2">
            <code className="truncate rounded bg-slate-100 px-2 py-1 font-mono text-[12px] text-slate-800">{request.action.command}</code>
            <Copy className="h-4 w-4 shrink-0 text-slate-400" />
          </span>
        </DetailRow>
        <DetailRow label="Workdir">{request.action.workdir}</DetailRow>
        <DetailRow label="Timeout">{request.action.timeout}</DetailRow>
        <DetailRow label="Max output">{request.action.maxOutput}</DetailRow>
        <DetailRow label="Env">{request.action.env}</DetailRow>
      </PanelSection>

      <PanelSection title="Policy decision">
        <DetailRow label="Decision">{request.policy.decision}</DetailRow>
        <DetailRow label="Risk level">
          <ApprovalRiskBadge risk={request.policy.riskLevel} />
        </DetailRow>
        <BulletBlock label="Reasons" items={request.policy.reasons} />
        <BulletBlock label="Constraints" items={request.policy.constraints} />
      </PanelSection>

      <PanelSection title="Requester">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${requesterStyles[request.requester.color]}`}>
              {request.requester.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-slate-950">{request.requester.name}</span>
              <span className="block truncate text-[12px] text-slate-500">{request.requester.role}</span>
            </span>
          </div>
          <div className="min-w-0 text-right text-[12px] text-slate-600">
            <div className="truncate">{request.requester.email}</div>
            <div className="mt-1 inline-flex items-center gap-1">
              ID: {request.requester.userId}
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Linked context">
        <LinkedRows request={request} />
      </PanelSection>
    </>
  );
}

function ScopeTab({ request }: { request: ApprovalRequest }) {
  return (
    <PanelSection title="Scope controls">
      <div className="space-y-2">
        {request.scope.map((item) => (
          <DetailRow key={item.label} label={item.label}>
            {item.value}
          </DetailRow>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-[12px] leading-5 text-slate-600">
        The action is bound to the active workspace and may not expand runtime network access without a separate approval.
      </div>
    </PanelSection>
  );
}

function LinkedTab({ request }: { request: ApprovalRequest }) {
  return (
    <PanelSection title="Linked context">
      <LinkedRows request={request} />
      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-[12px] leading-5 text-blue-700">
        Evidence, task state, and transcript replay will be attached to this approval once a decision is applied.
      </div>
    </PanelSection>
  );
}

function PolicyTab({ request }: { request: ApprovalRequest }) {
  return (
    <PanelSection title="Policy evaluation">
      <DetailRow label="Decision">{request.policy.decision}</DetailRow>
      <DetailRow label="Risk level">
        <ApprovalRiskBadge risk={request.policy.riskLevel} />
      </DetailRow>
      <BulletBlock label="Reasons" items={request.policy.reasons} />
      <BulletBlock label="Constraints" items={request.policy.constraints} />
    </PanelSection>
  );
}

function AuditTab({ request }: { request: ApprovalRequest }) {
  return (
    <PanelSection title="Audit trail">
      <div className="space-y-3">
        {request.auditTrail.map((event) => (
          <div key={`${event.time}-${event.event}`} className="grid grid-cols-[62px_1fr] gap-3 text-[12px]">
            <span className="text-slate-500">{event.time}</span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-800">{event.event}</span>
              <span className="block text-slate-500">{event.actor}</span>
              <span className="mt-1 block leading-5 text-slate-600">{event.detail}</span>
            </span>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

function LinkedRows({ request }: { request: ApprovalRequest }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Session">
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold text-blue-700">{request.linkedContext.sessionId}</span>
          <span>{request.linkedContext.sessionName}</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </DetailRow>
      <DetailRow label="Task">
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold text-blue-700">{request.linkedContext.taskId}</span>
          <span>{request.linkedContext.taskName}</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </DetailRow>
      <DetailRow label="Step">
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold text-blue-700">{request.linkedContext.stepId}</span>
          <span>{request.linkedContext.stepName}</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </DetailRow>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 py-4 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-[13px] font-semibold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2 grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-700">{children}</span>
    </div>
  );
}

function BulletBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-2 grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <ul className="list-disc space-y-1 pl-4 text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
