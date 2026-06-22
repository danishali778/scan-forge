import { ShieldCheck } from "lucide-react";

import { healthMetrics } from "@/mocks/provider-policies";
import type { ProviderHealthMetric } from "@/types/provider-policies";

function barColor(tone: "teal" | "amber" | "red") {
  if (tone === "amber") {
    return "bg-amber-500";
  }

  if (tone === "red") {
    return "bg-red-500";
  }

  return "bg-teal-700";
}

export function ProviderHealthCards({ metrics = healthMetrics }: { metrics?: ProviderHealthMetric[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <section key={metric.label} className="rounded-md border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-950">{metric.label}</h3>
          <div className="mt-5 space-y-4">
            {metric.rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_72px_70px] items-center gap-3 text-sm">
                <span className="text-slate-700">{row.label}</span>
                <span className="font-semibold text-slate-900">{row.value}</span>
                {row.helper ? (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 rounded-full bg-slate-200">
                      <span className={`block h-1.5 rounded-full ${barColor(row.tone)}`} style={{ width: row.helper }} />
                    </span>
                    <span className="w-8 text-right text-xs text-slate-500">{row.helper}</span>
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
          {metric.label === "Policy health" ? (
            <button className="mt-5 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Validate all policies
            </button>
          ) : null}
          {metric.label === "Session defaults" ? (
            <button className="mt-5 text-sm font-semibold text-teal-700">Edit session defaults</button>
          ) : null}
        </section>
      ))}
    </div>
  );
}
