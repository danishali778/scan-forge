import { apiRequest } from "@/api/client";
import type { ApiJob, Page } from "@/types/api";
import type {
  ApiMemoryDocument,
  MemoryCreateRequest,
  MemoryPromoteRequest,
  MemoryReviewRequest,
  MemorySearchRequest,
  MemorySearchResponse,
  MemoryUpdateRequest,
} from "@/types/memory-library";

export function listMemory(): Promise<Page<ApiMemoryDocument>> {
  return apiRequest<Page<ApiMemoryDocument>>("/memory");
}

export function listMemoryFiltered(filters: { status?: string; visibility?: string }): Promise<Page<ApiMemoryDocument>> {
  return apiRequest<Page<ApiMemoryDocument>>("/memory", {
    query: filters,
  });
}

export function createMemory(request: MemoryCreateRequest): Promise<ApiMemoryDocument> {
  return apiRequest<ApiMemoryDocument>("/memory", {
    method: "POST",
    body: request,
  });
}

export function getMemory(documentId: string): Promise<ApiMemoryDocument> {
  return apiRequest<ApiMemoryDocument>(`/memory/${documentId}`);
}

export function updateMemory(documentId: string, request: MemoryUpdateRequest): Promise<ApiMemoryDocument> {
  return apiRequest<ApiMemoryDocument>(`/memory/${documentId}`, {
    method: "PATCH",
    body: request,
  });
}

export function deleteMemory(documentId: string): Promise<ApiMemoryDocument> {
  return apiRequest<ApiMemoryDocument>(`/memory/${documentId}`, {
    method: "DELETE",
  });
}

export function approveMemory(documentId: string, request: MemoryReviewRequest): Promise<ApiJob> {
  return apiRequest<ApiJob>(`/memory/${documentId}/approve`, {
    method: "POST",
    body: request,
  });
}

export function rejectMemory(documentId: string, request: MemoryReviewRequest): Promise<ApiMemoryDocument> {
  return apiRequest<ApiMemoryDocument>(`/memory/${documentId}/reject`, {
    method: "POST",
    body: request,
  });
}

export function promoteMemory(documentId: string, request: MemoryPromoteRequest): Promise<ApiMemoryDocument> {
  return apiRequest<ApiMemoryDocument>(`/memory/${documentId}/promote`, {
    method: "POST",
    body: request,
  });
}

export function searchMemory(request: MemorySearchRequest): Promise<MemorySearchResponse> {
  return apiRequest<MemorySearchResponse>("/memory/search", {
    method: "POST",
    body: request,
  });
}
