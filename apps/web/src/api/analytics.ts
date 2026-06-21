import { apiRequest } from "@/api/client";
import type { Page } from "@/types/api";
import type {
  ApiAnalyticsApprovals,
  ApiAnalyticsFindings,
  ApiAnalyticsOverview,
  ApiAnalyticsSessions,
  ApiAnalyticsTools,
  ApiAuditEvent,
} from "@/types/analytics-audit";

export function getAnalyticsOverview(): Promise<ApiAnalyticsOverview> {
  return apiRequest<ApiAnalyticsOverview>("/analytics/overview");
}

export function getAnalyticsSessions(): Promise<ApiAnalyticsSessions> {
  return apiRequest<ApiAnalyticsSessions>("/analytics/sessions");
}

export function getAnalyticsTools(): Promise<ApiAnalyticsTools> {
  return apiRequest<ApiAnalyticsTools>("/analytics/tools");
}

export function getAnalyticsFindings(): Promise<ApiAnalyticsFindings> {
  return apiRequest<ApiAnalyticsFindings>("/analytics/findings");
}

export function getAnalyticsApprovals(): Promise<ApiAnalyticsApprovals> {
  return apiRequest<ApiAnalyticsApprovals>("/analytics/approvals");
}

export function listAuditEvents(): Promise<Page<ApiAuditEvent>> {
  return apiRequest<Page<ApiAuditEvent>>("/audit-events", {
    query: { limit: 20 },
  });
}
