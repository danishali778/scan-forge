import { apiRequest } from "@/api/client";
import type { Page } from "@/types/api";
import type {
  ApiMemoryDocument,
  MemorySearchRequest,
  MemorySearchResponse,
} from "@/types/memory-library";

export function listMemory(): Promise<Page<ApiMemoryDocument>> {
  return apiRequest<Page<ApiMemoryDocument>>("/memory");
}

export function searchMemory(request: MemorySearchRequest): Promise<MemorySearchResponse> {
  return apiRequest<MemorySearchResponse>("/memory/search", {
    method: "POST",
    body: request,
  });
}
