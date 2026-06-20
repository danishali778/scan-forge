import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Server,
  ShieldCheck,
} from "lucide-react";

import { approvalItems, liveEvents, memoryItems } from "@/mocks/session-command";

function RailCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function SessionRightRail() {
  return (
    <aside className="w-[360px] shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 bg-[#fbfcfd] p-4">
      <RailCard
        title="Live event stream"
        action={
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live
          </span>
        }
      >
        <div className="overflow-hidden rounded-lg border border-slate-200">
          {liveEvents.map((event, index) => (
            <div
              key={`${event.time}-${event.event}`}
              className={`grid grid-cols-[68px_1fr] gap-3 px-3 py-3 text-sm ${
                index > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <div className="font-mono text-xs text-slate-500">{event.time}</div>
              <div className="min-w-0 border-l border-slate-200 pl-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  <span className="font-semibold text-slate-800">{event.event}</span>
                  <span className="ml-auto text-xs text-slate-500">{event.actor}</span>
                </div>
                <div className="mt-1 truncate font-mono text-xs text-slate-500">{event.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          View full stream
          <ExternalLink className="h-4 w-4" />
        </button>
      </RailCard>

      <RailCard
        title="Runtime"
        action={
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Healthy
          </span>
        }
      >
        <div className="space-y-3 text-sm">
          {[
            ["Container", "sf-runtime-7c9d2e1f"],
            ["Uptime", "01:24:37"],
            ["CPU / Memory", "18% / 412MB (limit 2GB)"],
            ["Network", "Isolated (none)"],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[100px_1fr] gap-3">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-700">{value}</span>
            </div>
          ))}
          <div className="ml-[112px] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="h-2 w-14 rounded-full bg-slate-200" />
            <ShieldCheck className="ml-auto h-4 w-4 text-slate-500" />
          </div>
        </div>
        <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          View runtime details
        </button>
      </RailCard>

      <div className="grid grid-cols-2 gap-4">
        <RailCard
          title="Approvals"
          action={
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
              2 pending
              <ChevronRight className="h-3 w-3" />
            </span>
          }
        >
          <div className="space-y-2">
            {approvalItems.map((approval) => (
              <div key={approval.title} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-semibold text-slate-900">{approval.title}</div>
                <div className="mt-1 truncate font-mono text-xs text-slate-600">{approval.detail}</div>
                <div className="mt-2 text-xs text-slate-500">{approval.meta}</div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 text-sm font-semibold text-teal-700">
            View all approvals
          </button>
        </RailCard>

        <RailCard
          title="Memory context"
          action={<span className="text-sm text-slate-500">5 results</span>}
        >
          <div className="space-y-2">
            {memoryItems.map((memory) => (
              <div key={memory.title} className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{memory.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{memory.meta}</div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 text-sm font-semibold text-teal-700">
            Search memory
          </button>
        </RailCard>
      </div>

      <div className="sr-only">
        <Server />
      </div>
    </aside>
  );
}
