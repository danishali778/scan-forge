import { apiRequest } from "@/api/client";
import type { Page } from "@/types/api";
import type { ApiFinding, FindingReviewRequest, FindingUpdateRequest } from "@/types/evidence-review";

export function listSessionFindings(sessionId: string): Promise<Page<ApiFinding>> {
  return apiRequest<Page<ApiFinding>>(`/sessions/${sessionId}/findings`);
}

export function reviewFinding(findingId: string, request: FindingReviewRequest): Promise<ApiFinding> {
  return apiRequest<ApiFinding>(`/findings/${findingId}/review`, {
    method: "POST",
    body: request,
  });
}

export function updateFinding(findingId: string, request: FindingUpdateRequest): Promise<ApiFinding> {
  return apiRequest<ApiFinding>(`/findings/${findingId}`, {
    method: "PATCH",
    body: request,
  });
}
