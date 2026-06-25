import { FileText, Filter, GripVertical, Search } from "lucide-react";

import {
  ConfidenceBadge,
  FindingStatusBadge,
  Panel,
  SeverityBadge,
} from "@/components/report-builder/ReportBuilderPrimitives";
import type { ReportConfidence, ReportFinding, ReportSeverity } from "@/types/report-builder";

type IncludedFindingsPanelProps = {
  findings: ReportFinding[];
  severityFilter: "All severity" | ReportSeverity;
  confidenceFilter: "All confidence" | ReportConfidence;
  search: string;
  onSeverityFilterChange: (value: "All severity" | ReportSeverity) => void;
  onConfidenceFilterChange: (value: "All confidence" | ReportConfidence) => void;
  onSearchChange: (value: string) => void;
};

export function IncludedFindingsPanel({
  findings,
  severityFilter,
  confidenceFilter,
  search,
  onSeverityFilterChange,
  onConfidenceFilterChange,
  onSearchChange,
}: IncludedFindingsPanelProps) {
  return (
    <Panel
      title={`Included findings (${findings.length})`}
      action={
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(event) => onSeverityFilterChange(event.target.value as "All severity" | ReportSeverity)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 outline-none focus:border-teal-600"
          >
            <option>All severity</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
            <option>Info</option>
          </select>
          <select
            value={confidenceFilter}
            onChange={(event) => onConfidenceFilterChange(event.target.value as "All confidence" | ReportConfidence)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 outline-none focus:border-teal-600"
          >
            <option>All confidence</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search findings"
              className="h-8 w-[150px] rounded-md border border-slate-300 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-teal-600"
            />
          </label>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="w-[38px] px-3 py-3" />
              <th className="px-3 py-3">Finding</th>
              <th className="w-[104px] px-3 py-3">Severity</th>
              <th className="w-[108px] px-3 py-3">Confidence</th>
              <th className="w-[126px] px-3 py-3">Status</th>
              <th className="w-[92px] px-3 py-3">Evidence</th>
              <th className="w-[112px] px-3 py-3">Report section</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {findings.map((finding) => (
              <tr key={finding.id} className="align-middle hover:bg-slate-50/80">
                <td className="px-3 py-3">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                </td>
                <td className="px-3 py-3">
                  <div className="line-clamp-2 font-semibold leading-5 text-slate-900">{finding.title}</div>
                  <div className="mt-0.5 font-mono text-xs text-slate-500">ID: {finding.id}</div>
                </td>
                <td className="px-3 py-3">
                  <SeverityBadge severity={finding.severity} />
                </td>
                <td className="px-3 py-3">
                  <ConfidenceBadge confidence={finding.confidence} />
                </td>
                <td className="px-3 py-3">
                  <FindingStatusBadge status={finding.status} />
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4 text-slate-500" />
                    {finding.evidenceCount}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-700">{finding.section}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex h-10 items-center justify-between border-t border-slate-100 px-4 text-xs text-slate-500">
          <span>Showing {findings.length} backend findings</span>
          <span>Filtered by selected report statuses</span>
        </div>
      </div>
    </Panel>
  );
}
