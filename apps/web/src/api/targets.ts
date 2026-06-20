import { apiRequest } from "@/api/client";
import type { ApiTarget, Page, TargetCreateRequest } from "@/types/api";

export function listTargets(projectId: string): Promise<Page<ApiTarget>> {
  return apiRequest<Page<ApiTarget>>(`/projects/${projectId}/targets`);
}

export function createTarget(projectId: string, request: TargetCreateRequest): Promise<ApiTarget> {
  return apiRequest<ApiTarget>(`/projects/${projectId}/targets`, {
    method: "POST",
    body: request,
  });
}
