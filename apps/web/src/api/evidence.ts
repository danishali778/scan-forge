import { apiRequest } from "@/api/client";
import type { Page } from "@/types/api";
import type { ApiEvidence } from "@/types/evidence-review";

export function listSessionEvidence(sessionId: string): Promise<Page<ApiEvidence>> {
  return apiRequest<Page<ApiEvidence>>(`/sessions/${sessionId}/evidence`);
}

export function getEvidence(evidenceId: string): Promise<ApiEvidence> {
  return apiRequest<ApiEvidence>(`/evidence/${evidenceId}`);
}
