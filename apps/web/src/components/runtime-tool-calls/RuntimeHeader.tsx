import { MoreVertical, Play, RefreshCw, Square, Terminal } from "lucide-react";

import { RuntimeHealthPill, RuntimeModePill, RuntimeStatusPill } from "@/components/runtime-tool-calls/StatusPills";
import type { RuntimeToolCallsData } from "@/types/runtime-tool-calls";

type RuntimeHeaderProps = {
  data: Pick<RuntimeToolCallsData, "breadcrumb" | "status" | "health" | "mode">;
};

export function RuntimeHeader({ data }: RuntimeHeaderProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-[56px] items-center justify-between px-7">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {data.breadcrumb.map((item, index) => (
            <span key={item} className="flex min-w-0 items-center gap-2">
              <span className={index === data.breadcrumb.length - 1 ? "text-slate-950" : "text-slate-600"}>{item}</span>
              {index < data.breadcrumb.length - 1 ? <span className="text-slate-300">/</span> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-[72px] items-center justify-between gap-6 px-7">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Status</span>
            <RuntimeStatusPill status={data.status} />
          </div>
          <div className="h-8 border-l border-slate-200" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Runtime</span>
            <RuntimeHealthPill health={data.health} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Mode</span>
            <RuntimeModePill mode={data.mode} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            aria-label="Refresh runtime"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-300 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
          >
            <Play className="h-4 w-4" />
            Start runtime
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <Square className="h-3.5 w-3.5" />
            Stop runtime
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-teal-900 bg-teal-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            <Terminal className="h-4 w-4" />
            Request command
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            aria-label="More runtime actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
