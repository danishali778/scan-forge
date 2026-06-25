import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUser } from "@/api/auth";
import { listSessionEvidence } from "@/api/evidence";
import { listSessionFindings } from "@/api/findings";
import {
  createSessionReport,
  exportReport,
  finalizeReport,
  listSessionReports,
  renderReport,
  updateReport,
} from "@/api/reports";
import { listSessions } from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { defaultReportSections, mapReportBuilderData } from "@/lib/reportMapping";
import type { ReportSection } from "@/types/report-builder";

const reportKeys = {
  currentUser: ["reports", "current-user"] as const,
  sessions: ["reports", "sessions"] as const,
  reports: (sessionId: string) => ["reports", sessionId] as const,
  findings: (sessionId: string) => ["reports", sessionId, "findings"] as const,
  evidence: (sessionId: string) => ["reports", sessionId, "evidence"] as const,
};

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useReportBuilderData({
  selectedSessionId,
  selectedReportId,
  sections = defaultReportSections,
}: {
  selectedSessionId?: string;
  selectedReportId?: string;
  sections?: ReportSection[];
} = {}) {
  const sessions = useQuery({
    queryKey: reportKeys.sessions,
    queryFn: listSessions,
  });
  const sessionItems = pageItems(sessions.data);
  const sessionId =
    selectedSessionId && sessionItems.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : (sessionItems[0]?.id ?? "");
  const selectedSession = sessionItems.find((session) => session.id === sessionId) ?? null;

  const reports = useQuery({
    queryKey: reportKeys.reports(sessionId),
    queryFn: () => listSessionReports(sessionId),
    enabled: Boolean(sessionId),
  });

  const findings = useQuery({
    queryKey: reportKeys.findings(sessionId),
    queryFn: () => listSessionFindings(sessionId),
    enabled: Boolean(sessionId),
  });

  const evidence = useQuery({
    queryKey: reportKeys.evidence(sessionId),
    queryFn: () => listSessionEvidence(sessionId),
    enabled: Boolean(sessionId),
  });

  const currentUser = useQuery({
    queryKey: reportKeys.currentUser,
    queryFn: getCurrentUser,
  });

  const reportItems = pageItems(reports.data);
  const report =
    (selectedReportId ? reportItems.find((item) => item.id === selectedReportId) : undefined) ??
    reportItems[0] ??
    null;
  const reportData = mapReportBuilderData({
    report,
    session: selectedSession,
    findings: pageItems(findings.data),
    evidence: pageItems(evidence.data),
    currentUserEmail: currentUser.data?.email,
    sections,
  });

  return {
    sessionId,
    reportId: report?.id ?? "",
    sessions: sessionItems,
    reports: reportItems,
    report,
    reportData,
    isLoading: sessions.isLoading || reports.isLoading || findings.isLoading || evidence.isLoading || currentUser.isLoading,
    error: sessions.error ?? reports.error ?? findings.error ?? evidence.error ?? currentUser.error,
  };
}

export function useReportActions(sessionId: string | undefined, reportId: string | undefined) {
  const queryClient = useQueryClient();
  const resolvedSessionId = sessionId ?? "";
  const resolvedReportId = reportId ?? "";
  const invalidateReports = async () => {
    await queryClient.invalidateQueries({ queryKey: reportKeys.reports(resolvedSessionId) });
  };

  const create = useMutation({
    mutationFn: (title: string) => createSessionReport(resolvedSessionId, { title }),
    onSuccess: invalidateReports,
  });

  const updateTitle = useMutation({
    mutationFn: (title: string) => updateReport(resolvedReportId, { title }),
    onSuccess: invalidateReports,
  });

  const render = useMutation({
    mutationFn: () => renderReport(resolvedReportId),
    onSuccess: invalidateReports,
  });

  const finalize = useMutation({
    mutationFn: () => finalizeReport(resolvedReportId),
    onSuccess: invalidateReports,
  });

  const exportMarkdown = useMutation({
    mutationFn: () => exportReport(resolvedReportId, "markdown"),
    onSuccess: async (response) => {
      downloadText(response.filename, response.content, "text/markdown");
      await invalidateReports();
    },
  });

  const exportJson = useMutation({
    mutationFn: () => exportReport(resolvedReportId, "json"),
    onSuccess: async (response) => {
      downloadText(response.filename, response.content, "application/json");
      await invalidateReports();
    },
  });

  return {
    create,
    updateTitle,
    render,
    finalize,
    exportMarkdown,
    exportJson,
    error: create.error ?? updateTitle.error ?? render.error ?? finalize.error ?? exportMarkdown.error ?? exportJson.error,
    isBusy:
      create.isPending ||
      updateTitle.isPending ||
      render.isPending ||
      finalize.isPending ||
      exportMarkdown.isPending ||
      exportJson.isPending,
  };
}
