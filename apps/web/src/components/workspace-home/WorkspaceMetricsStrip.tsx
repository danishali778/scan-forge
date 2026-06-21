import type { WorkspaceMetric, WorkspaceTone } from "@/types/workspace-home";

const metricToneClasses: Record<WorkspaceTone, { icon: string; text: string; ring: string }> = {
  teal: {
    icon: "border-teal-500 bg-teal-500 text-white",
    text: "text-teal-700",
    ring: "shadow-[0_0_0_6px_rgba(20,184,166,0.12)]",
  },
  amber: {
    icon: "border-amber-400 bg-amber-400 text-amber-950",
    text: "text-amber-700",
    ring: "shadow-[0_0_0_6px_rgba(245,158,11,0.14)]",
  },
  red: {
    icon: "border-red-400 bg-red-200 text-red-800",
    text: "text-red-600",
    ring: "shadow-[0_0_0_6px_rgba(239,68,68,0.12)]",
  },
  cyan: {
    icon: "border-cyan-400 bg-cyan-200 text-teal-800",
    text: "text-teal-700",
    ring: "shadow-[0_0_0_6px_rgba(6,182,212,0.12)]",
  },
  blue: {
    icon: "border-blue-400 bg-blue-100 text-blue-700",
    text: "text-blue-700",
    ring: "shadow-[0_0_0_6px_rgba(59,130,246,0.12)]",
  },
  violet: {
    icon: "border-violet-400 bg-violet-100 text-violet-700",
    text: "text-violet-700",
    ring: "shadow-[0_0_0_6px_rgba(139,92,246,0.12)]",
  },
  slate: {
    icon: "border-slate-300 bg-slate-100 text-slate-700",
    text: "text-slate-600",
    ring: "shadow-[0_0_0_6px_rgba(100,116,139,0.12)]",
  },
};

function factToneClass(tone: WorkspaceTone = "slate") {
  return metricToneClasses[tone].text;
}

export function WorkspaceMetricsStrip({ metrics }: { metrics: WorkspaceMetric[] }) {
  return (
    <section className="grid h-[96px] shrink-0 grid-cols-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const tone = metricToneClasses[metric.tone];

        return (
          <div
            key={metric.label}
            className={`flex items-center gap-5 px-8 ${index > 0 ? "border-l border-slate-200" : ""}`}
          >
            <div className={`grid h-12 w-12 place-items-center rounded-full border ${tone.icon} ${tone.ring}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-500">{metric.label}</div>
              <div className="mt-1 text-[22px] font-semibold leading-none text-slate-950">{metric.value}</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
                {metric.facts.map((fact) => (
                  <span key={`${metric.label}-${fact.label}`} className="inline-flex items-center gap-1.5 text-slate-500">
                    <span className={`font-semibold ${factToneClass(fact.tone)}`}>{fact.value}</span>
                    {fact.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
