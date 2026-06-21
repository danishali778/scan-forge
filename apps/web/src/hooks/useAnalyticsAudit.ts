import { useQuery } from "@tanstack/react-query";

import {
  getAnalyticsApprovals,
  getAnalyticsFindings,
  getAnalyticsOverview,
  getAnalyticsSessions,
  getAnalyticsTools,
  listAuditEvents,
} from "@/api/analytics";
import { pageItems } from "@/lib/apiPages";
import {
  mapAnalyticsMetrics,
  mapAuditEvent,
  mapSeverityMetrics,
  mapStatusSlices,
  mapToolMetrics,
} from "@/lib/analyticsMapping";

export function useAnalyticsAudit() {
  const overview = useQuery({ queryKey: ["analytics", "overview"], queryFn: getAnalyticsOverview });
  const sessions = useQuery({ queryKey: ["analytics", "sessions"], queryFn: getAnalyticsSessions });
  const tools = useQuery({ queryKey: ["analytics", "tools"], queryFn: getAnalyticsTools });
  const findings = useQuery({ queryKey: ["analytics", "findings"], queryFn: getAnalyticsFindings });
  const approvals = useQuery({ queryKey: ["analytics", "approvals"], queryFn: getAnalyticsApprovals });
  const audit = useQuery({ queryKey: ["analytics", "audit-events"], queryFn: listAuditEvents });

  return {
    metrics: mapAnalyticsMetrics(overview.data, approvals.data),
    statusSlices: mapStatusSlices(sessions.data),
    toolMetrics: mapToolMetrics(tools.data),
    severityMetrics: mapSeverityMetrics(findings.data),
    auditEvents: pageItems(audit.data).map(mapAuditEvent),
    isLoading:
      overview.isLoading ||
      sessions.isLoading ||
      tools.isLoading ||
      findings.isLoading ||
      approvals.isLoading ||
      audit.isLoading,
    error:
      overview.error ??
      sessions.error ??
      tools.error ??
      findings.error ??
      approvals.error ??
      audit.error,
  };
}
