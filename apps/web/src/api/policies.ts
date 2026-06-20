import { apiRequest } from "@/api/client";
import type { ApiPolicy, Page } from "@/types/api";

export function listPolicies(): Promise<Page<ApiPolicy>> {
  return apiRequest<Page<ApiPolicy>>("/policies");
}
