import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { ExportHistoryTable } from "@/components/report-builder/ExportHistoryTable";
import { IncludedFindingsPanel } from "@/components/report-builder/IncludedFindingsPanel";
import { ReportBuilderHeader } from "@/components/report-builder/ReportBuilderHeader";
import { ReportInspectorPanel, type InspectorTab } from "@/components/report-builder/ReportInspectorPanel";
import { ReportOutlinePanel } from "@/components/report-builder/ReportOutlinePanel";
import { ReportSettingsPanel } from "@/components/report-builder/ReportSettingsPanel";
import { useReportActions, useReportBuilderData } from "@/hooks/useReports";
import { getErrorMessage } from "@/lib/errors";
import { defaultReportSections, defaultReportStatuses, riskSummary } from "@/lib/reportMapping";
import type {
  FindingStatus,
  ReportConfidence,
  ReportSection,
  ReportSeverity,
  ReportStatusOption,
} from "@/types/report-builder";

export function ReportsPage() {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [statuses, setStatuses] = useState<ReportStatusOption[]>(defaultReportStatuses);
  const [sections, setSections] = useState<ReportSection[]>(defaultReportSections);
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [exportMarkdown, setExportMarkdown] = useState(true);
  const [exportJson, setExportJson] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"All severity" | ReportSeverity>("All severity");
  const [confidenceFilter, setConfidenceFilter] = useState<"All confidence" | ReportConfidence>("All confidence");
  const [search, setSearch] = useState("");
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("Preview");
  const [titleDraft, setTitleDraft] = useState("");
  const backend = useReportBuilderData({ selectedSessionId, selectedReportId, sections });
  const actions = useReportActions(backend.sessionId, backend.reportId);
  const reportData = backend.reportData;
  const combinedError = backend.error ?? actions.error;

  useEffect(() => {
    if (backend.sessionId && backend.sessionId !== selectedSessionId) {
      setSelectedSessionId(backend.sessionId);
    }
  }, [backend.sessionId, selectedSessionId]);

  useEffect(() => {
    setSelectedReportId(backend.reportId);
  }, [backend.reportId]);

  useEffect(() => {
    setTitleDraft(reportData.title);
  }, [backend.reportId, reportData.title]);

  useEffect(() => {
    setStatuses(reportData.statuses);
    setSections(reportData.sections);
    setSelectedAuthor(reportData.authors[0]?.id ?? "");
    setSelectedReviewer(reportData.reviewers[0]?.id ?? "");
  }, [backend.report?.status, backend.reportId, backend.sessionId, reportData.evidence.length, reportData.findings.length]);

  const includedStatusIds = useMemo(
    () => new Set<FindingStatus>(statuses.filter((status) => status.included).map((status) => status.id)),
    [statuses],
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
      current.map((status) => (status.id === id ? { ...status, included: !status.included } : status)),
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
              metric: section.enabled ? "Disabled" : section.metric,
            }
          : section,
      ),
    );
  };

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSelectedReportId("");
  };

  const createReport = () => {
    const title = titleDraft.trim() || reportData.title;

    if (backend.sessionId) {
      actions.create.mutate(title);
    }
  };

  const updateTitle = () => {
    const title = titleDraft.trim();

    if (backend.reportId && title && title !== backend.report?.title) {
      actions.updateTitle.mutate(title);
    }
  };

  const canFinalize = backend.report?.status === "rendered";

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-w-0">
        <AppSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <ReportBuilderHeader
            title={reportData.title}
            status={reportData.status}
            sessionName={reportData.sessionName}
            sessions={backend.sessions.map((session) => ({ id: session.id, title: session.title }))}
            selectedSessionId={backend.sessionId}
            selectedReportId={backend.reportId}
            canFinalize={canFinalize}
            isBusy={actions.isBusy}
            onSessionChange={handleSessionChange}
            onCreateReport={createReport}
            onRender={() => actions.render.mutate()}
            onFinalize={() => actions.finalize.mutate()}
            onExportMarkdown={() => actions.exportMarkdown.mutate()}
            onExportJson={() => actions.exportJson.mutate()}
          />

          <div className="min-h-0 flex-1 overflow-auto bg-[#fbfcfd] p-3">
            <div className="min-w-[1320px]">
              {combinedError ? (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {getErrorMessage(combinedError)}
                </div>
              ) : null}
              {backend.isLoading ? (
                <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                  Loading backend reports...
                </div>
              ) : null}
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950">Backend report record</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {backend.reports.length} report{backend.reports.length === 1 ? "" : "s"} for this session
                  </div>
                </div>
                <select
                  value={backend.reportId}
                  disabled={backend.reports.length === 0}
                  onChange={(event) => setSelectedReportId(event.target.value)}
                  className="h-9 min-w-[320px] rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label="Select backend report"
                >
                  {backend.reports.length > 0 ? (
                    backend.reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.title} - {report.status}
                      </option>
                    ))
                  ) : (
                    <option value="">No report created yet</option>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-[300px_minmax(620px,1fr)_380px] gap-3">
                <ReportSettingsPanel
                  title={titleDraft}
                  scope={reportData.scope}
                  statuses={statuses}
                  sections={sections}
                  authors={reportData.authors}
                  reviewers={reportData.reviewers}
                  selectedAuthor={selectedAuthor}
                  selectedReviewer={selectedReviewer}
                  exportMarkdown={exportMarkdown}
                  exportJson={exportJson}
                  canEditReport={Boolean(backend.reportId)}
                  onTitleChange={setTitleDraft}
                  onTitleBlur={updateTitle}
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
                  riskSummary={riskSummary(visibleFindings)}
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default ReportsPage;
