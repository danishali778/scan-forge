import { AnalyticsDashboardPanels, AnalyticsTables } from "@/components/analytics-audit/AnalyticsDashboardPanels";
import { AnalyticsHeader } from "@/components/analytics-audit/AnalyticsHeader";
import { AnalyticsInspector } from "@/components/analytics-audit/AnalyticsInspector";
import { AnalyticsMetricsStrip } from "@/components/analytics-audit/AnalyticsMetrics";
import { AnalyticsSidebar } from "@/components/analytics-audit/AnalyticsSidebar";
import { AuditEventsTable } from "@/components/analytics-audit/AuditEventsTable";
import type { AnalyticsMetric, AuditEventRow, SeverityMetric, StatusSlice, ToolMetric } from "@/types/analytics-audit";

interface AnalyticsAuditScreenProps {
  metrics?: AnalyticsMetric[];
  statusSlices?: StatusSlice[];
  toolMetrics?: ToolMetric[];
  severityMetrics?: SeverityMetric[];
  auditEvents?: AuditEventRow[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function AnalyticsAuditScreen({
  metrics,
  statusSlices,
  toolMetrics,
  severityMetrics,
  auditEvents,
  isLoading = false,
  errorMessage = null,
}: AnalyticsAuditScreenProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <AnalyticsSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AnalyticsHeader />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-[920px] flex-1 space-y-3 overflow-y-auto p-3">
              {errorMessage ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {errorMessage}
                </div>
              ) : null}
              {isLoading ? (
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                  Loading backend analytics...
                </div>
              ) : null}
              <AnalyticsMetricsStrip items={metrics} />
              <AnalyticsDashboardPanels slices={statusSlices} severityItems={severityMetrics} />
              <AnalyticsTables tools={toolMetrics} />
              <AuditEventsTable events={auditEvents} />
            </main>
            <AnalyticsInspector />
          </div>
        </div>
      </div>
    </div>
  );
}
