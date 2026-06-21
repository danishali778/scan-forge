import { ChevronDown, RefreshCw } from "lucide-react";

import { analyticsTabs, topActions } from "@/mocks/analytics-audit";

export function AnalyticsHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-[70px] items-center justify-between px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Operational insights, reliability, and audit overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex h-10 min-w-[145px] items-center justify-between gap-4 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
            All projects
            <ChevronDown className="h-4 w-4" />
          </button>
          {topActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                <Icon className="h-4 w-4" />
                <span>{action.label}</span>
                {"helper" in action && action.helper ? <span className="font-normal text-slate-400">{action.helper}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex h-12 items-center justify-between px-6">
        <nav className="flex h-full items-end gap-8">
          {analyticsTabs.map((tab) => (
            <button
              key={tab}
              className={[
                "relative h-full text-sm font-semibold",
                tab === "Overview" ? "text-teal-800" : "text-slate-600",
              ].join(" ")}
            >
              {tab}
              {tab === "Overview" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-700" /> : null}
            </button>
          ))}
        </nav>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <RefreshCw className="h-4 w-4" />
          Auto-refresh: On
          <span className="h-2 w-2 rounded-full bg-teal-600" />
        </span>
      </div>
    </header>
  );
}
