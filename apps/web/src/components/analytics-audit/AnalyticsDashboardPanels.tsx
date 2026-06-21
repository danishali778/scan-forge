import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { sessionFindings, severities, statusSlices, toolMetrics } from "@/mocks/analytics-audit";
import type { SeverityMetric, SessionFindingMetric, StatusSlice, ToolMetric } from "@/types/analytics-audit";

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function toneColor(tone: string) {
  if (tone === "critical") return "bg-red-700";
  if (tone === "high") return "bg-orange-500";
  if (tone === "medium") return "bg-amber-500";
  if (tone === "low") return "bg-emerald-500";
  return "bg-blue-500";
}

export function AnalyticsDashboardPanels({
  slices = statusSlices,
  severityItems = severities,
}: {
  slices?: StatusSlice[];
  severityItems?: SeverityMetric[];
}) {
  const totalSessions = slices.reduce((total, slice) => total + slice.value, 0);

  return (
    <div className="grid grid-cols-[1fr_1.15fr_1fr_1fr] gap-3">
      <Panel title="Sessions by status" subtitle="Last 30 days">
        <div className="flex items-center gap-5">
          <div className="grid h-36 w-36 place-items-center rounded-full border-[28px] border-teal-600 bg-white text-sm font-semibold text-slate-700">
            {totalSessions}
          </div>
          <div className="space-y-2">
            {slices.map((slice) => (
              <div key={slice.label} className="grid grid-cols-[12px_82px_1fr] items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${slice.color}`} />
                <span className="font-medium text-slate-700">{slice.label}</span>
                <span className="text-slate-500">{slice.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Tool calls by status" subtitle="Last 30 days">
        <div className="flex h-36 items-end gap-1">
          {Array.from({ length: 28 }).map((_, index) => (
            <div key={index} className="flex w-2.5 flex-col justify-end gap-0.5">
              <span className="rounded-sm bg-emerald-500" style={{ height: 50 + ((index * 7) % 24) }} />
              <span className="h-2 rounded-sm bg-red-500" />
              <span className="h-1.5 rounded-sm bg-slate-500" />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          {["Succeeded", "Failed", "Denied", "Queued", "Running"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </Panel>

      <Panel title="Findings by severity" subtitle="Last 30 days">
        <div className="space-y-3">
          {severityItems.map((severity) => (
            <div key={severity.severity} className="grid grid-cols-[70px_1fr_60px] items-center gap-3 text-sm">
              <span className="text-slate-700">{severity.severity}</span>
              <span className="h-2 rounded-full bg-slate-100">
                <span className={`block h-2 rounded-full ${toneColor(severity.tone)}`} style={{ width: `${severity.count * 8}%` }} />
              </span>
              <span className="text-right text-slate-600">
                {severity.count} ({severity.percent})
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Approval resolution time" subtitle="Last 30 days">
        <div className="text-2xl font-bold text-slate-950">18m 42s</div>
        <p className="mt-1 text-sm text-slate-500">Median time to decision</p>
        <p className="mt-2 text-xs font-semibold text-emerald-700">15% vs prior 30d</p>
        <div className="mt-5 flex h-20 items-end gap-1">
          {[18, 24, 17, 31, 26, 19, 36, 22, 16, 14, 21, 18, 12].map((height, index) => (
            <span key={index} className="w-3 rounded-t bg-blue-300" style={{ height }} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function AnalyticsTables({
  tools = toolMetrics,
  sessions = sessionFindings,
}: {
  tools?: ToolMetric[];
  sessions?: SessionFindingMetric[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Panel title="Top tools by success rate" subtitle="Last 30 days">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              {["Tool", "Calls", "Success rate", "Failure rate", "Denied rate", "P95 latency"].map((head) => (
                <th key={head} className="py-2 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tools.map((tool) => (
              <tr key={tool.tool}>
                <td className="py-2 font-mono text-xs text-slate-800">{tool.tool}</td>
                <td className="py-2">{tool.calls}</td>
                <td className="py-2 font-semibold text-emerald-700">{tool.successRate}</td>
                <td className="py-2 font-semibold text-red-600">{tool.failureRate}</td>
                <td className="py-2">{tool.deniedRate}</td>
                <td className="py-2">{tool.p95}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          View all tools <ArrowRight className="h-4 w-4" />
        </button>
      </Panel>

      <Panel title="Sessions with most confirmed findings" subtitle="Last 30 days">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              {["Session", "Project", "Findings", "Highest severity"].map((head) => (
                <th key={head} className="py-2 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <tr key={session.sessionId}>
                <td className="py-2">
                  <div className="font-semibold text-slate-900">{session.session}</div>
                  <div className="font-mono text-xs text-slate-500">{session.sessionId}</div>
                </td>
                <td className="py-2">{session.project}</td>
                <td className="py-2 font-semibold">{session.findings}</td>
                <td className="py-2">
                  <span
                    className={[
                      "rounded-md border px-2 py-0.5 text-xs font-semibold",
                      session.severity === "High"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : session.severity === "Medium"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                    ].join(" ")}
                  >
                    {session.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          View all sessions <ArrowRight className="h-4 w-4" />
        </button>
      </Panel>
    </div>
  );
}
