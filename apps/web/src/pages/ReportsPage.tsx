import { useMemo, useState } from "react";

import { ExportHistoryTable } from "@/components/report-builder/ExportHistoryTable";
import { IncludedFindingsPanel } from "@/components/report-builder/IncludedFindingsPanel";
import { ReportBuilderHeader } from "@/components/report-builder/ReportBuilderHeader";
import { ReportBuilderSidebar } from "@/components/report-builder/ReportBuilderSidebar";
import { ReportInspectorPanel, type InspectorTab } from "@/components/report-builder/ReportInspectorPanel";
import { ReportOutlinePanel } from "@/components/report-builder/ReportOutlinePanel";
import { ReportSettingsPanel } from "@/components/report-builder/ReportSettingsPanel";
import { useReportBuilderData } from "@/hooks/useReports";
import { getErrorMessage } from "@/lib/errors";
import { reportBuilderMock } from "@/mocks/report-builder";
import type {
  FindingStatus,
  ReportConfidence,
  ReportSection,
  ReportSeverity,
  ReportStatusOption,
} from "@/types/report-builder";

export function ReportsPage() {
  const [statuses, setStatuses] = useState<ReportStatusOption[]>(reportBuilderMock.statuses);
  const [sections, setSections] = useState<ReportSection[]>(reportBuilderMock.sections);
  const [selectedAuthor, setSelectedAuthor] = useState(reportBuilderMock.authors[0]?.id ?? "");
  const [selectedReviewer, setSelectedReviewer] = useState(reportBuilderMock.reviewers[0]?.id ?? "");
  const [exportMarkdown, setExportMarkdown] = useState(true);
  const [exportJson, setExportJson] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"All severity" | ReportSeverity>("All severity");
  const [confidenceFilter, setConfidenceFilter] = useState<"All confidence" | ReportConfidence>("All confidence");
  const [search, setSearch] = useState("");
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("Preview");
  const backend = useReportBuilderData();
  const reportData = backend.report ?? reportBuilderMock;

  const includedStatusIds = useMemo(
    () => new Set<FindingStatus>(statuses.filter((status) => status.included).map((status) => status.id)),
    [statuses]
  );

  const visibleFindings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reportData.findings.filter((finding) => {
      const matchesStatus = includedStatusIds.has(finding.status);
      const matchesSeverity = severityFilter === "All severity" || finding.severity === severityFilter;
      const matchesConfidence = confidenceFilter === "All confidence" || finding.confidence === confidenceFilter;
      const matchesSearch =
        query.length === 0 ||
        finding.title.toLowerCase().includes(query) ||
        finding.id.toLowerCase().includes(query);

      return matchesStatus && matchesSeverity && matchesConfidence && matchesSearch;
    });
  }, [confidenceFilter, includedStatusIds, reportData.findings, search, severityFilter]);

  const toggleStatus = (id: FindingStatus) => {
    setStatuses((current) =>
      current.map((status) => (status.id === id ? { ...status, included: !status.included } : status))
    );
  };

  const toggleSection = (id: string) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id
          ? {
              ...section,
              enabled: !section.enabled,
              complete: !section.enabled,
              metric: section.enabled ? "0 pages" : section.id === "appendix" ? "1 page" : section.metric,
            }
          : section
      )
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-w-[1560px]">
        <ReportBuilderSidebar navigation={reportBuilderMock.navigation} />

        <main className="flex min-w-0 flex-1 flex-col">
          <ReportBuilderHeader
            title={reportData.title}
            status={reportData.status}
            sessionName={reportData.sessionName}
          />

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfcfd] p-3">
            {backend.error ? (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                {getErrorMessage(backend.error)}
              </div>
            ) : null}
            {backend.isLoading ? (
              <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                Loading backend reports...
              </div>
            ) : null}
            <div className="grid grid-cols-[300px_minmax(620px,1fr)_380px] gap-3">
              <ReportSettingsPanel
                title={reportData.title}
                scope={reportData.scope}
                statuses={statuses}
                sections={sections}
                authors={reportData.authors}
                reviewers={reportData.reviewers}
                selectedAuthor={selectedAuthor}
                selectedReviewer={selectedReviewer}
                exportMarkdown={exportMarkdown}
                exportJson={exportJson}
                onToggleStatus={toggleStatus}
                onToggleSection={toggleSection}
                onAuthorChange={setSelectedAuthor}
                onReviewerChange={setSelectedReviewer}
                onExportMarkdownChange={() => setExportMarkdown((value) => !value)}
                onExportJsonChange={() => setExportJson((value) => !value)}
              />

              <div className="min-w-0 space-y-4">
                <IncludedFindingsPanel
                  findings={visibleFindings}
                  severityFilter={severityFilter}
                  confidenceFilter={confidenceFilter}
                  search={search}
                  onSeverityFilterChange={setSeverityFilter}
                  onConfidenceFilterChange={setConfidenceFilter}
                  onSearchChange={setSearch}
                />
                <ReportOutlinePanel sections={sections} />
              </div>

              <ReportInspectorPanel
                activeTab={activeInspectorTab}
                onTabChange={setActiveInspectorTab}
                riskSummary={reportData.riskSummary}
                totalFindings={visibleFindings.length}
                evidence={reportData.evidence}
                exportAssets={reportData.exportAssets}
                readiness={reportData.readiness}
              />
            </div>

            <div className="mt-3">
              <ExportHistoryTable exports={reportData.exportHistory} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ReportsPage;
