import { Archive, ChevronRight, Copy, Pause, Play, Square, X } from "lucide-react";
import type { ReactNode } from "react";

import { SessionStatusBadge } from "@/components/sessions-list/SessionStatusBadge";
import type { SessionsListSession } from "@/types/sessions-list";

const ownerColorStyles: Record<SessionsListSession["owner"]["color"], string> = {
  teal: "bg-teal-100 text-teal-800",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
};

const eventToneStyles: Record<SessionsListSession["latestEvents"][number]["tone"], string> = {
  teal: "border-teal-600 bg-teal-500",
  amber: "border-amber-500 bg-amber-400",
  slate: "border-slate-400 bg-white",
};

type SessionDetailsPanelProps = {
  session: SessionsListSession;
  actionState: "idle" | "paused" | "stopped";
  onActionStateChange: (state: "idle" | "paused" | "stopped") => void;
};

export function SessionDetailsPanel({ session, actionState, onActionStateChange }: SessionDetailsPanelProps) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-slate-950">{session.title}</h2>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-slate-500">
              <span>{session.id}</span>
              <button type="button" className="text-slate-400 hover:text-slate-700" aria-label="Copy session id">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <PanelSection title="Summary">
          <DetailRow label="Status">
            <SessionStatusBadge status={session.status} />
          </DetailRow>
          <DetailRow label="Project">
            <span className="font-semibold text-teal-700">{session.project}</span>
          </DetailRow>
          <DetailRow label="Scope">{session.scope}</DetailRow>
          <DetailRow label="Owner">
            <span className="inline-flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${ownerColorStyles[session.owner.color]}`}>
                {session.owner.initials}
              </span>
              {session.owner.name}
            </span>
          </DetailRow>
          <DetailRow label="Created">{session.createdAt}</DetailRow>
          <DetailRow label="Last updated">{session.updatedAt}</DetailRow>
        </PanelSection>

        <PanelSection title="Objective">
          <p className="text-[13px] leading-5 text-slate-700">{session.objective}</p>
        </PanelSection>

        <PanelSection title="Provider & Policy">
          <DetailRow label="Provider profile">
            <span className="font-semibold text-teal-700">{session.providerProfile}</span>
          </DetailRow>
          <DetailRow label="Policy">
            <span className="font-semibold text-teal-700">{session.policy}</span>
          </DetailRow>
        </PanelSection>

        <PanelSection title="Progress">
          <DetailRow label="Current task">{session.progress.currentTask}</DetailRow>
          <ProgressRow label="Task progress" value={session.progress.taskProgressLabel} percent={session.progress.taskProgressPercent} />
          <ProgressRow label="Step progress" value={session.progress.stepProgressLabel} percent={session.progress.stepProgressPercent} />
        </PanelSection>

        <PanelSection title="Latest events">
          <div className="space-y-3">
            {session.latestEvents.map((event) => (
              <div key={`${event.time}-${event.label}`} className="grid grid-cols-[58px_12px_1fr] gap-2 text-[12px]">
                <span className="text-slate-500">{event.time}</span>
                <span className={`mt-1.5 h-2 w-2 rounded-full border ${eventToneStyles[event.tone]}`} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{event.label}</span>
                  <span className="block truncate text-slate-500">{event.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </PanelSection>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-slate-950">Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={actionState !== "idle"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 text-[13px] font-semibold text-slate-400 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 fill-current" />
            Start
          </button>
          <button
            type="button"
            onClick={() => onActionStateChange(actionState === "paused" ? "idle" : "paused")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Pause className="h-4 w-4 fill-current" />
            Pause
          </button>
          <button
            type="button"
            onClick={() => onActionStateChange("stopped")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white text-[13px] font-semibold text-red-600 hover:bg-red-50"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open in workbench
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-3 text-[13px] font-semibold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2 grid grid-cols-[104px_1fr] gap-3 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-right text-slate-700">{children}</span>
    </div>
  );
}

function ProgressRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="mb-3 grid grid-cols-[92px_1fr] items-center gap-3 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium text-slate-700">{value}</span>
          <span className="text-slate-500">{percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-teal-700" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
