import { sessionOverviewStatuses, sessionsOverviewMetrics } from "@/mocks/sessions-list";

export function SessionsOverview() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex h-11 items-center gap-2 border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Overview</h2>
        <span className="text-[13px] text-slate-500">(Last 30 days)</span>
      </div>

      <div className="grid grid-cols-[260px_repeat(4,1fr)] divide-x divide-slate-200 p-4">
        <div className="flex items-center gap-5 pr-4">
          <div
            className="h-[100px] w-[100px] rounded-full"
            style={{
              background:
                "conic-gradient(#a5b4fc 0 8%, #60a5fa 8% 21%, #14b8a6 21% 46%, #fbbf24 46% 59%, #94a3b8 59% 67%, #22c55e 67% 88%, #ef4444 88% 92%, #64748b 92% 96%, #cbd5e1 96% 100%)",
            }}
          >
            <div className="m-[22px] h-[56px] w-[56px] rounded-full bg-white" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="mb-2 text-[12px] font-semibold text-slate-950">Sessions by status</div>
            {sessionOverviewStatuses.map((item) => (
              <div key={item.status} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-sm ${item.colorClass}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-slate-700">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {sessionsOverviewMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ metric }: { metric: (typeof sessionsOverviewMetrics)[number] }) {
  return (
    <div className="px-5">
      <div className="text-[12px] font-semibold text-slate-950">{metric.label}</div>
      <div className="mt-4 text-[20px] font-semibold text-slate-950">{metric.value}</div>
      <div className="mt-1 text-[12px] text-slate-500">{metric.helper}</div>
      {metric.trend ? (
        <div className="mt-5 flex h-9 items-end gap-1">
          {metric.trend.map((point, index) => (
            <span
              key={`${metric.label}-${index}`}
              className={[
                "w-2 rounded-t-sm",
                metric.tone === "red" ? "bg-red-400" : metric.tone === "teal" ? "bg-teal-300" : "bg-slate-300",
              ].join(" ")}
              style={{ height: `${Math.max(14, point)}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-2 text-[12px] text-slate-600">
          <div className="flex justify-between">
            <span>Requests</span>
            <span className="font-medium text-slate-900">28</span>
          </div>
          <div className="flex justify-between">
            <span>Approved</span>
            <span className="font-medium text-slate-900">21 (75%)</span>
          </div>
          <div className="flex justify-between">
            <span>Denied</span>
            <span className="font-medium text-red-600">7 (25%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
