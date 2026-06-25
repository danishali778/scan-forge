import { CheckCircle2, FileText } from "lucide-react";

import { TinyTag } from "@/components/report-builder/ReportBuilderPrimitives";
import type {
  EvidenceReference,
  ExportAsset,
  ReadinessItem,
  RiskSummaryItem,
} from "@/types/report-builder";

type InspectorTab = "Preview" | "Assets" | "Events" | "Checklist";

type ReportInspectorPanelProps = {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  riskSummary: RiskSummaryItem[];
  totalFindings: number;
  evidence: EvidenceReference[];
  exportAssets: ExportAsset[];
  readiness: ReadinessItem[];
};

const tabItems: InspectorTab[] = ["Preview", "Assets", "Events", "Checklist"];

const riskStyles = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-orange-200 bg-orange-50 text-orange-700",
  Low: "border-amber-200 bg-amber-50 text-amber-700",
  Info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function ReportInspectorPanel({
  activeTab,
  onTabChange,
  riskSummary,
  totalFindings,
  evidence,
  exportAssets,
  readiness,
}: ReportInspectorPanelProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 pt-4">
        <h2 className="text-base font-semibold text-slate-950">Report Preview & Inspector</h2>
        <div className="mt-4 flex gap-7">
          {tabItems.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`relative pb-3 text-sm font-semibold ${
                activeTab === tab ? "text-teal-700" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
              {activeTab === tab ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-600" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-4">
        {activeTab === "Preview" ? (
          <>
            <section>
              <h3 className="text-base font-semibold text-slate-950">Executive Summary (preview)</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This preview is generated from backend report data. Render the report to persist deterministic Markdown and JSON
                export content for this session.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-slate-950">Risk Summary (preview)</h3>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {riskSummary.map((item) => (
                  <div key={item.severity} className={`rounded-md border p-3 text-center ${riskStyles[item.severity]}`}>
                    <div className="text-xs font-semibold">{item.severity}</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{item.count}</div>
                    <div className="text-xs text-slate-600">{item.percent}%</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="font-semibold text-slate-700">Total findings</span>
                <span className="font-semibold text-slate-900">{totalFindings}</span>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{activeTab} workspace</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Backend report metadata is shown here as it becomes available. Render or export the report to create stored assets.
            </p>
          </section>
        )}

        <section>
          <h3 className="text-base font-semibold text-slate-950">Evidence References</h3>
          <div className="mt-3 space-y-2">
            {evidence.length > 0 ? evidence.map((item) => (
              <div key={item.id} className="flex min-w-0 items-center gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                <a href="#evidence" className="font-semibold text-blue-600 hover:text-blue-700">
                  {item.id}
                </a>
                <span className="truncate text-xs text-slate-500">{item.label}</span>
              </div>
            )) : <div className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">No backend evidence references yet.</div>}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-slate-950">Export Events (latest)</h3>
          <div className="mt-3 space-y-3">
            {exportAssets.length > 0 ? exportAssets.map((asset) => (
              <div key={asset.name} className="grid grid-cols-[1fr_64px_64px] items-center gap-3 text-sm">
                <span className="min-w-0">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <a href="#asset" className="truncate font-semibold text-blue-600 hover:text-blue-700">
                      {asset.name}
                    </a>
                  </span>
                  <TinyTag>{asset.kind}</TinyTag>
                </span>
                <span className="text-xs text-slate-500">{asset.size}</span>
                <span className="text-xs text-slate-500">{asset.generatedAgo}</span>
              </div>
            )) : <div className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">No export assets have been created yet.</div>}
          </div>
          <button type="button" disabled className="mt-3 cursor-not-allowed text-sm font-semibold text-slate-400">
            View all export assets
          </button>
        </section>

        <section>
          <h3 className="text-base font-semibold text-slate-950">Report Readiness</h3>
          <div className="mt-3 space-y-2">
            {readiness.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {item.label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export type { InspectorTab };
