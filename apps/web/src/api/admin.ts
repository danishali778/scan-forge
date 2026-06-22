import { apiRequest } from "@/api/client";
import type { ApiRole, ApiUser, ApiWorkspace, Page } from "@/types/api";

export function getWorkspace(): Promise<ApiWorkspace> {
  return apiRequest<ApiWorkspace>("/workspace");
}

export function listRoles(): Promise<Page<ApiRole>> {
  return apiRequest<Page<ApiRole>>("/roles");
}

export function listUsers(): Promise<Page<ApiUser>> {
  return apiRequest<Page<ApiUser>>("/users");
}
