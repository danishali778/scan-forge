import { Check, Circle, Info, Minus } from "lucide-react";

import type { FindingStatus, ReportConfidence, ReportSeverity } from "@/types/report-builder";

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-950">
          {title}
          <Info className="h-4 w-4 text-slate-400" />
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const severityStyles: Record<ReportSeverity, string> = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-orange-200 bg-orange-50 text-orange-700",
  Low: "border-amber-200 bg-amber-50 text-amber-700",
  Info: "border-sky-200 bg-sky-50 text-sky-700",
};

const confidenceStyles: Record<ReportConfidence, string> = {
  High: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-orange-200 bg-orange-50 text-orange-700",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

const findingStatusStyles: Record<FindingStatus, string> = {
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Accepted Risk": "border-blue-200 bg-blue-50 text-blue-700",
  Fixed: "border-violet-200 bg-violet-50 text-violet-700",
  Candidate: "border-slate-200 bg-slate-50 text-slate-600",
  "Needs Review": "border-amber-200 bg-amber-50 text-amber-700",
  "False Positive": "border-slate-200 bg-slate-50 text-slate-600",
  Archived: "border-slate-200 bg-slate-100 text-slate-500",
};

export function SeverityBadge({ severity }: { severity: ReportSeverity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${severityStyles[severity]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: ReportConfidence }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${confidenceStyles[confidence]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {confidence}
    </span>
  );
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${findingStatusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function TinyTag({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "teal" | "green";
}) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return <span className={`rounded-md border px-1.5 py-0.5 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}

export function CheckboxControl({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={onChange}>
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm border ${
          checked ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span className="truncate text-sm text-slate-700">{label}</span>
    </button>
  );
}

export function ToggleSwitch({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={enabled}
      onClick={onToggle}
      className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${enabled ? "bg-teal-700" : "bg-slate-300"}`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${enabled ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

export function CompletionIcon({ complete }: { complete: boolean }) {
  return complete ? (
    <Check className="h-4 w-4 rounded-full border border-emerald-500 p-0.5 text-emerald-600" />
  ) : (
    <Minus className="h-4 w-4 rounded-full border border-slate-300 p-0.5 text-slate-400" />
  );
}

export function EmptyDot() {
  return <Circle className="h-3 w-3 text-slate-300" />;
}
