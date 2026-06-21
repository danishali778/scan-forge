import { metrics } from "@/mocks/analytics-audit";
import type { AnalyticsMetric } from "@/types/analytics-audit";

function Sparkline({ metric }: { metric: AnalyticsMetric }) {
  const max = Math.max(...metric.sparkline);
  const min = Math.min(...metric.sparkline);
  const color = metric.tone === "red" ? "bg-red-500" : metric.tone === "amber" ? "bg-amber-500" : "bg-teal-600";

  return (
    <div className="flex h-9 w-24 items-end gap-1">
      {metric.sparkline.map((value, index) => {
        const height = 8 + ((value - min) / Math.max(max - min, 1)) * 26;
        return <span key={`${metric.label}-${index}`} className={`w-1.5 rounded-full ${color}`} style={{ height }} />;
      })}
    </div>
  );
}

export function AnalyticsMetricsStrip({ items = metrics }: { items?: AnalyticsMetric[] }) {
  return (
    <section className="grid grid-cols-5 overflow-hidden rounded-md border border-slate-200 bg-white">
      {items.map((metric, index) => (
        <div key={metric.label} className={["p-4", index > 0 ? "border-l border-slate-200" : ""].join(" ")}>
          <div className="text-sm font-semibold text-slate-900">{metric.label}</div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-slate-950">{metric.value}</div>
              <div
                className={[
                  "mt-2 text-xs font-semibold",
                  metric.tone === "red" ? "text-red-600" : metric.tone === "amber" ? "text-amber-600" : "text-emerald-700",
                ].join(" ")}
              >
                {metric.helper}
              </div>
            </div>
            <Sparkline metric={metric} />
          </div>
        </div>
      ))}
    </section>
  );
}
