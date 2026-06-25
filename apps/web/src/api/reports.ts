import { apiRequest } from "@/api/client";
import type { ApiJob, Page } from "@/types/api";
import type { ApiReport, ReportCreateRequest, ReportExportResponse, ReportUpdateRequest } from "@/types/report-builder";

export function listSessionReports(sessionId: string): Promise<Page<ApiReport>> {
  return apiRequest<Page<ApiReport>>(`/sessions/${sessionId}/reports`);
}

export function createSessionReport(sessionId: string, request: ReportCreateRequest): Promise<ApiReport> {
  return apiRequest<ApiReport>(`/sessions/${sessionId}/reports`, {
    method: "POST",
    body: request,
  });
}

export function getReport(reportId: string): Promise<ApiReport> {
  return apiRequest<ApiReport>(`/reports/${reportId}`);
}

export function updateReport(reportId: string, request: ReportUpdateRequest): Promise<ApiReport> {
  return apiRequest<ApiReport>(`/reports/${reportId}`, {
    method: "PATCH",
    body: request,
  });
}

export function deleteReport(reportId: string): Promise<ApiReport> {
  return apiRequest<ApiReport>(`/reports/${reportId}`, {
    method: "DELETE",
  });
}

export function renderReport(reportId: string): Promise<ApiJob> {
  return apiRequest<ApiJob>(`/reports/${reportId}/render`, {
    method: "POST",
  });
}

export function finalizeReport(reportId: string): Promise<ApiReport> {
  return apiRequest<ApiReport>(`/reports/${reportId}/finalize`, {
    method: "POST",
  });
}

export function exportReport(reportId: string, format: "markdown" | "json"): Promise<ReportExportResponse> {
  return apiRequest<ReportExportResponse>(`/reports/${reportId}/export`, {
    query: { format },
  });
}
