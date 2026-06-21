import { AnalyticsDashboardPanels, AnalyticsTables } from "@/components/analytics-audit/AnalyticsDashboardPanels";
import { AnalyticsHeader } from "@/components/analytics-audit/AnalyticsHeader";
import { AnalyticsInspector } from "@/components/analytics-audit/AnalyticsInspector";
import { AnalyticsMetricsStrip } from "@/components/analytics-audit/AnalyticsMetrics";
import { AnalyticsSidebar } from "@/components/analytics-audit/AnalyticsSidebar";
import { AuditEventsTable } from "@/components/analytics-audit/AuditEventsTable";

export function AnalyticsAuditScreen() {
  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <AnalyticsSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AnalyticsHeader />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-[920px] flex-1 space-y-3 overflow-y-auto p-3">
              <AnalyticsMetricsStrip />
              <AnalyticsDashboardPanels />
              <AnalyticsTables />
              <AuditEventsTable />
            </main>
            <AnalyticsInspector />
          </div>
        </div>
      </div>
    </div>
  );
}
