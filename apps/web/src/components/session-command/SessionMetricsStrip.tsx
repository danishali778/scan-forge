import { metricItems } from "@/mocks/session-command";
import type { MetricItem } from "@/types/session-command";

function Sparkline({ item }: { item: MetricItem }) {
  const max = Math.max(...item.sparkline);
  const min = Math.min(...item.sparkline);
  const points = item.sparkline
    .map((value, index) => {
      const x = (index / (item.sparkline.length - 1)) * 88;
      const y = 28 - ((value - min) / Math.max(max - min, 1)) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke =
    item.tone === "red" ? "#ef4444" : item.tone === "amber" ? "#f59e0b" : "#0f766e";

  return (
    <svg aria-hidden="true" className="h-9 w-24" viewBox="0 0 88 32" fill="none">
      <polyline points={points} stroke={stroke} strokeWidth="2" fill="none" />
    </svg>
  );
}

export function SessionMetricsStrip() {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
      <div className="grid min-w-[1200px] grid-cols-6 divide-x divide-slate-200">
        {metricItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="px-6 first:pl-0 last:pr-0">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Icon className="h-5 w-5" />
                <span className="font-semibold">{item.label}</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold leading-none text-slate-950">{item.value}</div>
                  <div
                    className={`mt-2 text-xs font-semibold ${
                      item.tone === "red"
                        ? "text-red-600"
                        : item.tone === "amber"
                          ? "text-amber-600"
                          : "text-teal-700"
                    }`}
                  >
                    {item.helper}
                  </div>
                </div>
                <Sparkline item={item} />
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
