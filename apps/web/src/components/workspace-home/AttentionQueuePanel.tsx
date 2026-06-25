import type { AttentionGroup, Severity, WorkspaceTone } from "@/types/workspace-home";

const severityClasses: Record<Severity, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-cyan-200 bg-cyan-50 text-teal-700",
};

const countClasses: Record<WorkspaceTone, string> = {
  teal: "bg-teal-100 text-teal-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  cyan: "bg-cyan-100 text-teal-800",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

function severityLabel(severity: Severity) {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function AttentionQueuePanel({ groups, className = "" }: { groups: AttentionGroup[]; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Attention queue</h2>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-slate-900">{group.title}</h3>
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${countClasses[group.tone]}`}>
                  {group.count}
                </span>
              </div>
              <button type="button" className="text-[12px] font-semibold text-blue-700">
                View all
              </button>
            </div>

            <div className="space-y-2">
              {group.items.map((item) => (
                <button key={item.id} type="button" className="grid w-full grid-cols-[48px_1fr] gap-3 text-left">
                  <span className={`w-fit rounded border px-2 py-1 text-[11px] font-medium ${severityClasses[item.severity]}`}>
                    {severityLabel(item.severity)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-slate-900">{item.title}</span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] text-slate-500">
                      <span className="truncate">{item.session}</span>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                      <span className="shrink-0">{item.age}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
