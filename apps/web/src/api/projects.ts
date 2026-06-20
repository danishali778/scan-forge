import { apiRequest } from "@/api/client";
import type {
  ApiProject,
  ApiScope,
  Page,
  ProjectCreateRequest,
  ScopeCreateRequest,
} from "@/types/api";

export function listProjects(): Promise<Page<ApiProject>> {
  return apiRequest<Page<ApiProject>>("/projects");
}

export function createProject(request: ProjectCreateRequest): Promise<ApiProject> {
  return apiRequest<ApiProject>("/projects", {
    method: "POST",
    body: request,
  });
}

export function listScopes(projectId: string): Promise<Page<ApiScope>> {
  return apiRequest<Page<ApiScope>>(`/projects/${projectId}/scopes`);
}

export function createScope(projectId: string, request: ScopeCreateRequest): Promise<ApiScope> {
  return apiRequest<ApiScope>(`/projects/${projectId}/scopes`, {
    method: "POST",
    body: request,
  });
}
