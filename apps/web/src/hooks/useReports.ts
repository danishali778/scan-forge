import { useQuery } from "@tanstack/react-query";

import { listSessionReports } from "@/api/reports";
import { listSessions } from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { mapReportBuilderData } from "@/lib/reportMapping";

const reportKeys = {
  sessions: ["reports", "sessions"] as const,
  reports: (sessionId: string) => ["reports", sessionId] as const,
};

export function useReportBuilderData() {
  const sessions = useQuery({
    queryKey: reportKeys.sessions,
    queryFn: listSessions,
  });
  const sessionId = pageItems(sessions.data)[0]?.id ?? "";

  const reports = useQuery({
    queryKey: reportKeys.reports(sessionId),
    queryFn: () => listSessionReports(sessionId),
    enabled: Boolean(sessionId),
  });

  const report = pageItems(reports.data)[0];

  return {
    sessionId,
    report: report ? mapReportBuilderData(report) : null,
    isLoading: sessions.isLoading || reports.isLoading,
    error: sessions.error ?? reports.error,
  };
}
