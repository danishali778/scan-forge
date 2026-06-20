import type { SessionListStatus } from "@/types/sessions-list";

const statusStyles: Record<SessionListStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  planning: "border-blue-200 bg-blue-50 text-blue-700",
  running: "border-teal-200 bg-teal-50 text-teal-700",
  awaiting_approval: "border-amber-200 bg-amber-50 text-amber-700",
  paused: "border-slate-200 bg-slate-100 text-slate-600",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  stopped: "border-slate-300 bg-slate-100 text-slate-700",
  archived: "border-slate-200 bg-slate-50 text-slate-500",
};

const statusLabels: Record<SessionListStatus, string> = {
  draft: "Draft",
  planning: "Planning",
  running: "Running",
  awaiting_approval: "Awaiting approval",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  stopped: "Stopped",
  archived: "Archived",
};

export function SessionStatusBadge({ status }: { status: SessionListStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
