import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

import type { PolicyDecision, RiskLevel, RuntimeHealth, RuntimeMode, RuntimeStatus, ToolCallStatus } from "@/types/runtime-tool-calls";

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusLabel(status: ToolCallStatus | RuntimeStatus | RuntimeHealth | RuntimeMode | RiskLevel) {
  return titleCase(status);
}

export function policyLabel(policy: PolicyDecision) {
  if (policy === "require_approval") {
    return "Require approval";
  }

  return titleCase(policy);
}

export function ToolStatusPill({ status }: { status: ToolCallStatus }) {
  const tone = {
    succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    running: "bg-sky-50 text-sky-700 ring-sky-200",
    queued: "bg-blue-50 text-blue-700 ring-blue-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
    denied: "bg-red-50 text-red-700 ring-red-200",
  }[status];

  return (
    <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

export function PolicyPill({ policy }: { policy: PolicyDecision }) {
  const tone = {
    allow: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    require_approval: "bg-amber-50 text-amber-700 ring-amber-200",
    denied: "bg-red-50 text-red-700 ring-red-200",
  }[policy];

  return (
    <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      {policyLabel(policy)}
    </span>
  );
}

export function RiskPill({ riskLevel }: { riskLevel: RiskLevel }) {
  const tone = {
    low: "bg-blue-50 text-blue-700 ring-blue-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    high: "bg-red-50 text-red-700 ring-red-200",
  }[riskLevel];

  return (
    <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      {statusLabel(riskLevel)}
    </span>
  );
}

export function RuntimeStatusPill({ status }: { status: RuntimeStatus }) {
  const tone = status === "running" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${tone}`}>
      <span className={status === "running" ? "h-1.5 w-1.5 rounded-full bg-emerald-500" : "h-1.5 w-1.5 rounded-full bg-slate-400"} />
      {statusLabel(status)}
    </span>
  );
}

export function RuntimeHealthPill({ health }: { health: RuntimeHealth }) {
  const Icon = health === "healthy" ? ShieldCheck : AlertTriangle;
  const tone = health === "healthy" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(health)}
    </span>
  );
}

export function RuntimeModePill({ mode }: { mode: RuntimeMode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
      <Clock3 className="h-3.5 w-3.5" />
      {statusLabel(mode)}
    </span>
  );
}

export function HealthCheckIcon({ status }: { status: "ok" | "warning" | "failed" }) {
  if (status === "ok") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  return <AlertTriangle className={status === "warning" ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-red-600"} />;
}
