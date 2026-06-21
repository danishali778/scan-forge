import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  PlayCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

import type { ApprovalRequest, Severity } from "@/types/workspace-home";

const severityClasses: Record<Severity, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-cyan-200 bg-cyan-50 text-teal-700",
};

function severityLabel(severity: Severity) {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function ApprovalRequestPanel({ request }: { request: ApprovalRequest }) {
  const [decision, setDecision] = useState<"idle" | "approved" | "denied">("idle");
  const [note, setNote] = useState("");

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Approval request</h2>
        <div className="flex items-center gap-3 text-slate-400">
          <button type="button" className="hover:text-slate-700">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="hover:text-slate-700">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" className="hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${severityClasses[request.severity]}`}>
            {severityLabel(request.severity)}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-[12px] font-medium text-slate-500">{request.state}</span>
        </div>

        <h3 className="mt-3 text-[17px] font-semibold leading-snug text-slate-950">{request.title}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>Request ID</span>
          <span className="truncate">{request.requestId}</span>
          <Copy className="h-3.5 w-3.5 shrink-0" />
        </div>

        <section className="mt-4 border-t border-slate-200 pt-3">
          <div className="text-[12px] font-semibold text-slate-900">Session</div>
          <div className="mt-2 flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
            <PlayCircle className="h-5 w-5 shrink-0 text-slate-500" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-blue-700">{request.sessionTitle}</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                {request.sessionId} <span className="px-1.5 text-slate-300">|</span> {request.project}
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </div>
        </section>

        <section className="mt-4 border-t border-slate-200 pt-3">
          <div className="text-[12px] font-semibold text-slate-900">Requested by</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25455d] text-[11px] font-bold text-white">DA</span>
            <div>
              <div className="text-[12px] font-semibold text-slate-900">
                {request.requester} ({request.requesterRole})
              </div>
              <div className="text-[11px] text-slate-500">{request.requestedAgo}</div>
            </div>
          </div>
        </section>

        <section className="mt-4 border-t border-slate-200 pt-3">
          <div className="text-[12px] font-semibold text-slate-900">Policy details</div>
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[12px] font-semibold text-amber-900">{request.policyName}</div>
                <div className="text-[12px] text-amber-800">Risk level: {request.riskLevel}</div>
                <div className="mt-3 text-[11px] font-semibold text-slate-900">Reasons</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
                  {request.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="mt-3 text-[11px] font-semibold text-slate-900">Constraints</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
                  {request.constraints.map((constraint) => (
                    <li key={constraint}>{constraint}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 border-t border-slate-200 pt-3">
          <div className="text-[12px] font-semibold text-slate-900">Tool details</div>
          <div className="mt-2 space-y-2">
            {request.toolDetails.map((detail) => (
              <div key={detail.label} className="grid grid-cols-[86px_minmax(0,1fr)] gap-3 text-[12px]">
                <span className="font-semibold text-slate-700">{detail.label}</span>
                <span
                  className={[
                    "min-w-0 truncate text-slate-600",
                    detail.monospace ? "rounded bg-slate-100 px-2 py-1 font-mono text-[11px]" : "",
                  ].join(" ")}
                >
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDecision("approved")}
            className={[
              "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-semibold text-white",
              decision === "approved" ? "bg-emerald-700" : "bg-teal-700 hover:bg-teal-800",
            ].join(" ")}
          >
            <Check className="h-4 w-4" />
            {decision === "approved" ? "Approved" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setDecision("denied")}
            className={[
              "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-semibold text-white",
              decision === "denied" ? "bg-red-800" : "bg-red-600 hover:bg-red-700",
            ].join(" ")}
          >
            <X className="h-4 w-4" />
            {decision === "denied" ? "Denied" : "Deny"}
          </button>
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for audit log..."
          className="mt-3 h-12 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          CSRF protected
        </div>
      </div>
    </aside>
  );
}
