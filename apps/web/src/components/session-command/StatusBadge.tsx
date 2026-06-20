import { CheckCircle2, Circle, Play, Timer } from "lucide-react";

import type { SessionStepStatus } from "@/types/session-command";

type StatusBadgeProps = {
  status: SessionStepStatus | "running" | "in_progress" | "completed" | "pending";
  compact?: boolean;
};

const statusStyles = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  running: "border-teal-200 bg-teal-50 text-teal-700",
  in_progress: "border-teal-200 bg-teal-50 text-teal-700",
  pending: "border-slate-200 bg-white text-slate-500",
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "running" || status === "in_progress"
        ? Play
        : compact
          ? Circle
          : Timer;

  const label =
    status === "in_progress"
      ? "In progress"
      : status === "completed"
        ? "Completed"
        : status === "running"
          ? "In progress"
          : "Pending";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact ? label : null}
    </span>
  );
}
