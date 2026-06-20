import { apiRequest } from "@/api/client";
import type { ApiProviderProfile, Page } from "@/types/api";

export function listProviderProfiles(): Promise<Page<ApiProviderProfile>> {
  return apiRequest<Page<ApiProviderProfile>>("/provider-profiles");
}
