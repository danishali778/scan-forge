import { ArrowDown, ArrowUp, BarChart3 } from "lucide-react";

import type { ApprovalMetric, ApprovalRisk, ApprovalRiskSummary } from "@/types/approval-queue";

type ApprovalMetricsPanelProps = {
  metrics: ApprovalMetric[];
  riskSummary: ApprovalRiskSummary[];
  timeSeries: number[];
};

const riskColors: Record<ApprovalRisk, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export function ApprovalMetricsPanel({ metrics, riskSummary, timeSeries }: ApprovalMetricsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-[52px] items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">
          Approval metrics <span className="font-medium text-slate-500">(last 30 days)</span>
        </h2>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          View analytics
          <BarChart3 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 p-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[12px] font-semibold text-slate-500">{metric.label}</div>
            <div className="mt-4 text-[26px] font-semibold leading-none text-slate-950">{metric.value}</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              {metric.trend === "down" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
              {metric.helper}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-[13px] font-semibold text-slate-950">Requests by risk</h3>
          <div className="mt-5 flex items-center gap-6">
            <div
              className="h-[100px] w-[100px] rounded-full"
              style={{
                background: "conic-gradient(#ef4444 0 22%, #f59e0b 22% 67%, #22c55e 67% 100%)",
              }}
            >
              <div className="m-[24px] h-[52px] w-[52px] rounded-full bg-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {riskSummary.map((item) => (
                <div key={item.risk} className="flex items-center justify-between gap-3 text-[12px] text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-sm ${riskColors[item.risk]}`} />
                    {item.label}
                  </span>
                  <span className="font-medium text-slate-700">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-[13px] font-semibold text-slate-950">Avg. time to decision</h3>
          <div className="mt-4 text-[24px] font-semibold leading-none text-slate-950">18m 42s</div>
          <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
            <ArrowDown className="h-3.5 w-3.5" />
            15% vs prior 30d
          </div>
          <div className="mt-5 flex h-[58px] items-end gap-2">
            {timeSeries.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="w-2 rounded-t-sm bg-blue-400/85"
                style={{ height: `${Math.max(12, value)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>Jun 12</span>
            <span>Jun 19</span>
          </div>
        </div>
      </div>
    </section>
  );
}
