import {
  BriefcaseBusiness,
  ChevronDown,
  Download,
  MoreVertical,
  Pause,
  Square,
} from "lucide-react";

import { sessionFacts } from "@/mocks/session-command";

export function SessionCommandHeader() {
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
            External staging review
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
            className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Running
          </button>
          <div className="h-10 border-l border-slate-200" />
          {sessionFacts.map((fact) => {
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
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600"
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
