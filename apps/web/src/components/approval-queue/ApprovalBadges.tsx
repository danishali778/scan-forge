import type { ApprovalRisk, ApprovalStatus } from "@/types/approval-queue";

const riskStyles: Record<ApprovalRisk, string> = {
  high: "border-red-200 bg-red-50 text-red-600",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const statusStyles: Record<ApprovalStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  denied: "border-red-200 bg-red-50 text-red-700",
  expired: "border-slate-300 bg-slate-50 text-slate-600",
};

const statusLabels: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  expired: "Expired",
};

export function ApprovalRiskBadge({ risk }: { risk: ApprovalRisk }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[12px] font-semibold ${riskStyles[risk]}`}>
      {risk[0].toUpperCase()}
      {risk.slice(1)}
    </span>
  );
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[12px] font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
