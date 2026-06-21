import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleOff,
  Clock3,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";

import { sourceIcons } from "@/mocks/memory-library";
import type {
  EmbeddingStatus,
  MemorySource,
  MemoryStatus,
  MemoryVisibility,
  SecretScanStatus,
} from "@/types/memory-library";

const statusStyles: Record<MemoryStatus, string> = {
  Candidate: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Archived: "border-slate-200 bg-slate-50 text-slate-600",
  Blocked: "border-red-200 bg-red-50 text-red-700",
};

const visibilityStyles: Record<MemoryVisibility, string> = {
  Session: "border-blue-200 bg-blue-50 text-blue-700",
  Project: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Workspace: "border-violet-200 bg-violet-50 text-violet-700",
};

const sourceStyles: Record<MemorySource, string> = {
  Agent: "text-violet-700",
  Finding: "text-orange-700",
  Evidence: "text-blue-700",
  Manual: "text-slate-700",
  Report: "text-green-700",
};

const scanStyles: Record<SecretScanStatus, string> = {
  Clean: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Flagged: "border-red-200 bg-red-50 text-red-700",
};

const embeddingStyles: Record<EmbeddingStatus, string> = {
  Pending: "border-slate-200 bg-slate-50 text-slate-600",
  Embedded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Blocked: "border-red-200 bg-red-50 text-red-700",
  None: "border-slate-200 bg-white text-slate-400",
};

export function StatusBadge({ status }: { status: MemoryStatus }) {
  return (
    <span className={`inline-flex h-6 items-center rounded px-2 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export function VisibilityBadge({ visibility }: { visibility: MemoryVisibility }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded border px-2 text-xs font-semibold ${visibilityStyles[visibility]}`}
    >
      {visibility}
    </span>
  );
}

export function SourceLabel({ source }: { source: MemorySource }) {
  const Icon = sourceIcons[source];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${sourceStyles[source]}`}>
      <Icon className="h-3.5 w-3.5" />
      {source}
    </span>
  );
}

export function SecretScanBadge({ status }: { status: SecretScanStatus }) {
  const Icon = status === "Clean" ? CheckCircle2 : AlertTriangle;

  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded border px-2 text-xs font-semibold ${scanStyles[status]}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function EmbeddingBadge({ status }: { status: EmbeddingStatus }) {
  if (status === "None") {
    return <span className="text-slate-400">-</span>;
  }

  const Icon = status === "Pending" ? Clock3 : status === "Embedded" ? PackageCheck : CircleOff;

  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded border px-2 text-xs font-semibold ${embeddingStyles[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function TabIcon({ status, active }: { status: MemoryStatus; active: boolean }) {
  const className = `h-4 w-4 ${active ? "" : "opacity-80"}`;

  if (status === "Approved") {
    return <CheckCircle2 className={className} />;
  }

  if (status === "Rejected") {
    return <CircleOff className={className} />;
  }

  if (status === "Archived") {
    return <Archive className={className} />;
  }

  if (status === "Blocked") {
    return <ShieldAlert className={className} />;
  }

  return <Clock3 className={className} />;
}
