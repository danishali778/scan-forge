import {
  BriefcaseBusiness,
  ChevronDown,
  Download,
  MoreVertical,
  Pause,
  Square,
} from "lucide-react";

import { sessionFacts } from "@/mocks/session-command";
import { humanizeStatus } from "@/lib/formatters";
import type { ApiSessionDetail } from "@/types/api";

interface SessionCommandHeaderProps {
  session?: ApiSessionDetail;
  isMutating?: boolean;
  onPause?: () => void;
  onStop?: () => void;
}

function statusTone(status: string) {
  if (["running", "planning"].includes(status)) {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  if (["paused", "awaiting_approval"].includes(status)) {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (["failed", "stopped"].includes(status)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-300 bg-slate-50 text-slate-700";
}

function statusDot(status: string) {
  if (["running", "planning"].includes(status)) {
    return "bg-emerald-500";
  }

  if (["paused", "awaiting_approval"].includes(status)) {
    return "bg-amber-500";
  }

  if (["failed", "stopped"].includes(status)) {
    return "bg-red-500";
  }

  return "bg-slate-400";
}

export function SessionCommandHeader({ session, isMutating = false, onPause, onStop }: SessionCommandHeaderProps) {
  const status = session?.status ?? "running";
  const title = session?.title ?? "External staging review";
  const facts = sessionFacts.map((fact) => {
    if (fact.label === "Mode") {
      return { ...fact, value: session?.mode ? humanizeStatus(session.mode) : fact.value };
    }

    if (fact.label === "Provider") {
      return { ...fact, value: session?.provider_profile_id ? "Configured" : "Not selected" };
    }

    if (fact.label === "Policy") {
      return { ...fact, value: session?.policy_id ? "Configured" : "Not selected" };
    }

    return fact;
  });

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-[64px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="text-slate-500">Projects</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">Acme Staging Review</span>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold text-slate-950"
          >
            {title}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700"
          >
            <BriefcaseBusiness className="h-4 w-4" />
            Acme Corp Workspace
            <ChevronDown className="h-4 w-4" />
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
            DA
          </div>
        </div>
      </div>

      <div className="flex h-[72px] items-center justify-between gap-6 px-6">
        <div className="flex min-w-0 items-center gap-5">
          <button
            type="button"
            className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold ${statusTone(status)}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusDot(status)}`} />
            {humanizeStatus(status)}
          </button>
          <div className="h-10 border-l border-slate-200" />
          {facts.map((fact) => {
            const Icon = fact.icon;

            return (
              <div key={fact.label} className="flex min-w-[150px] items-center gap-3">
                <Icon className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-xs text-slate-500">{fact.label}</div>
                  <div className="text-sm font-semibold text-slate-900">{fact.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
            onClick={onPause}
            disabled={!onPause || isMutating}
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600"
            onClick={onStop}
            disabled={!onStop || isMutating}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
          >
            <Download className="h-4 w-4" />
            Export replay
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-slate-500">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
