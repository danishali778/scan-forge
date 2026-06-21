import { AnalyticsAuditScreen } from "@/components/analytics-audit/AnalyticsAuditScreen";
import { useAnalyticsAudit } from "@/hooks/useAnalyticsAudit";
import { getErrorMessage } from "@/lib/errors";

export function AnalyticsAuditPage() {
  const analytics = useAnalyticsAudit();

  return (
    <AnalyticsAuditScreen
      metrics={analytics.metrics}
      statusSlices={analytics.statusSlices.length > 0 ? analytics.statusSlices : undefined}
      toolMetrics={analytics.toolMetrics.length > 0 ? analytics.toolMetrics : undefined}
      severityMetrics={analytics.severityMetrics.length > 0 ? analytics.severityMetrics : undefined}
      auditEvents={analytics.auditEvents.length > 0 ? analytics.auditEvents : undefined}
      isLoading={analytics.isLoading}
      errorMessage={analytics.error ? getErrorMessage(analytics.error) : null}
    />
  );
}

export default AnalyticsAuditPage;
