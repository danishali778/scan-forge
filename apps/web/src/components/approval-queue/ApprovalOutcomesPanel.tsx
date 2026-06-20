import { Check, Clock3, Eye, X } from "lucide-react";

import type { ApprovalOutcome, ApprovalStatus } from "@/types/approval-queue";

type ApprovalOutcomesPanelProps = {
  outcomes: ApprovalOutcome[];
};

const outcomeStyles: Record<ApprovalStatus, { label: string; ring: string; text: string; icon: typeof Check }> = {
  approved: { label: "Approved", ring: "border-emerald-500 text-emerald-600", text: "text-emerald-700", icon: Check },
  denied: { label: "Denied", ring: "border-red-500 text-red-600", text: "text-red-600", icon: X },
  pending: { label: "Pending", ring: "border-amber-500 text-amber-600", text: "text-amber-600", icon: Clock3 },
  expired: { label: "Expired", ring: "border-slate-400 text-slate-500", text: "text-slate-500", icon: Clock3 },
};

export function ApprovalOutcomesPanel({ outcomes }: ApprovalOutcomesPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-[52px] items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Recent approval outcomes</h2>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          View all
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        {outcomes.map((outcome) => {
          const style = outcomeStyles[outcome.status];
          const Icon = style.icon;

          return (
            <div key={outcome.id} className="grid grid-cols-[26px_minmax(0,1fr)_58px] gap-3 text-[12px]">
              <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${style.ring}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={`block text-[12px] font-semibold ${style.text}`}>{style.label}</span>
                <span className="mt-1 block truncate text-[13px] font-medium text-slate-800">{outcome.title}</span>
                <span className="mt-1 block truncate text-[12px] text-slate-500">
                  {outcome.sessionId} <span className="mx-1">.</span> {outcome.requester}
                </span>
              </span>
              <span className="text-right text-[12px] text-slate-500">{outcome.age}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
