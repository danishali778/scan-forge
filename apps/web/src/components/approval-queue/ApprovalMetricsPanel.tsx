import { ArrowDown, ArrowUp, BarChart3 } from "lucide-react";

import type { ApprovalMetric, ApprovalRisk, ApprovalRiskSummary } from "@/types/approval-queue";

type ApprovalMetricsPanelProps = {
  metrics: ApprovalMetric[];
  riskSummary: ApprovalRiskSummary[];
  timeSeries: number[];
  averageResolutionLabel: string;
  dateRangeLabel: string;
  timeSeriesStartLabel: string;
  timeSeriesEndLabel: string;
};

const riskColors: Record<ApprovalRisk, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const riskGradientColors: Record<ApprovalRisk, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function riskGradient(riskSummary: ApprovalRiskSummary[]) {
  const total = riskSummary.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return "#e2e8f0";
  }

  let cursor = 0;

  return `conic-gradient(${riskSummary
    .map((item) => {
      const start = cursor;
      const next = cursor + (item.count / total) * 100;
      cursor = next;
      return `${riskGradientColors[item.risk]} ${start}% ${next}%`;
    })
    .join(", ")})`;
}

export function ApprovalMetricsPanel({
  metrics,
  riskSummary,
  timeSeries,
  averageResolutionLabel,
  dateRangeLabel,
  timeSeriesStartLabel,
  timeSeriesEndLabel,
}: ApprovalMetricsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-[52px] items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">
          Approval metrics <span className="font-medium text-slate-500">({dateRangeLabel})</span>
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
                background: riskGradient(riskSummary),
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
          <div className="mt-4 text-[24px] font-semibold leading-none text-slate-950">{averageResolutionLabel}</div>
          <div className="mt-3 text-[12px] font-semibold text-slate-500">From resolved backend approvals</div>
          <div className="mt-5 flex h-[58px] items-end gap-2">
            {timeSeries.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className={value > 0 ? "w-2 rounded-t-sm bg-blue-400/85" : "w-2 rounded-t-sm bg-slate-200"}
                style={{ height: `${value > 0 ? Math.max(12, value) : 4}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{timeSeriesStartLabel}</span>
            <span>{timeSeriesEndLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
