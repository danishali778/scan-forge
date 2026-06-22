import { apiRequest } from "@/api/client";
import type { Page } from "@/types/api";
import type { ApiReport } from "@/types/report-builder";

export function listSessionReports(sessionId: string): Promise<Page<ApiReport>> {
  return apiRequest<Page<ApiReport>>(`/sessions/${sessionId}/reports`);
}
