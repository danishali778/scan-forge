import { ArrowRight, BriefcaseBusiness, FileText, Info, X } from "lucide-react";

export function AnalyticsInspector() {
  return (
    <aside className="w-[300px] shrink-0 border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <h2 className="text-base font-semibold text-slate-950">Job failures <span className="font-normal text-slate-500">(last 30 days)</span></h2>
        <X className="h-4 w-4 text-slate-500" />
      </div>
      <div className="space-y-5 p-4 text-sm">
        <section>
          <div className="text-2xl font-bold text-slate-950">3</div>
          <div className="mt-1 text-slate-500">Total failures</div>
          <div className="mt-2 text-xs font-semibold text-emerald-700">25% vs prior 30d</div>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">Related sessions</h3>
            <button className="text-xs font-semibold text-blue-600">View all</button>
          </div>
          <div className="mt-3 space-y-3">
            {[
              ["Internal network review", "ses_7bd0c8e6", "2"],
              ["External staging review", "ses_8f12bd7a1", "1"],
            ].map(([name, id, count]) => (
              <div key={id} className="grid grid-cols-[32px_1fr_20px] items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600">
                  <BriefcaseBusiness className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold text-blue-600">{name}</span>
                  <span className="block font-mono text-xs text-slate-500">{id}</span>
                </span>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="font-semibold text-slate-950">Top failed tools</h3>
          <div className="mt-3 space-y-3">
            {[
              ["terminal.execute", "2 (12.7%)"],
              ["file.write", "1 (33.3%)"],
              ["http.request", "0 (0%)"],
            ].map(([tool, value]) => (
              <div key={tool} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-mono text-xs text-slate-700">
                  <FileText className="h-4 w-4" />
                  {tool}
                </span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="font-semibold text-slate-950">Most common failure reasons</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>Exit code non-zero <span className="font-semibold">2 (66.7%)</span></li>
            <li>Timeout exceeded <span className="font-semibold">1 (33.3%)</span></li>
          </ul>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="font-semibold text-slate-950">Recommended follow-up</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>Review network ACLs and firewall rules for runtime.</li>
            <li>Validate target host availability and DNS resolution.</li>
            <li>Check tool timeouts and increase if needed.</li>
          </ul>
          <button className="mt-4 inline-flex items-center gap-2 font-semibold text-teal-700">
            View full failures log <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>
      <div className="sr-only">
        <Info />
      </div>
    </aside>
  );
}
