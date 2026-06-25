import { apiRequest } from "@/api/client";
import type {
  ApiJob,
  ApiRuntimeInstance,
  ApiSessionDetail,
  ApiSessionSummary,
  ApiSessionEvent,
  ApiTask,
  ApiToolCall,
  Page,
  SessionCreateRequest,
} from "@/types/api";

export function createSession(request: SessionCreateRequest): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>("/sessions", {
    method: "POST",
    body: request,
  });
}

export function listSessions(): Promise<Page<ApiSessionSummary>> {
  return apiRequest<Page<ApiSessionSummary>>("/sessions");
}

export function getSession(sessionId: string): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>(`/sessions/${sessionId}`);
}

export function listSessionTasks(sessionId: string): Promise<Page<ApiTask>> {
  return apiRequest<Page<ApiTask>>(`/sessions/${sessionId}/tasks`);
}

export function listSessionJobs(sessionId: string): Promise<Page<ApiJob>> {
  return apiRequest<Page<ApiJob>>(`/sessions/${sessionId}/jobs`);
}

export function listSessionEvents(sessionId: string): Promise<Page<ApiSessionEvent>> {
  return apiRequest<Page<ApiSessionEvent>>(`/sessions/${sessionId}/events`);
}

export function getSessionRuntime(sessionId: string): Promise<ApiRuntimeInstance | null> {
  return apiRequest<ApiRuntimeInstance | null>(`/sessions/${sessionId}/runtime`);
}

export function listSessionToolCalls(sessionId: string): Promise<Page<ApiToolCall>> {
  return apiRequest<Page<ApiToolCall>>(`/sessions/${sessionId}/tool-calls`);
}

export function pauseSession(sessionId: string): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>(`/sessions/${sessionId}/pause`, {
    method: "POST",
  });
}

export function startSession(sessionId: string): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>(`/sessions/${sessionId}/start`, {
    method: "POST",
  });
}

export function resumeSession(sessionId: string): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>(`/sessions/${sessionId}/resume`, {
    method: "POST",
  });
}

export function stopSession(sessionId: string): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>(`/sessions/${sessionId}/stop`, {
    method: "POST",
  });
}

export function archiveSession(sessionId: string): Promise<ApiSessionDetail> {
  return apiRequest<ApiSessionDetail>(`/sessions/${sessionId}/archive`, {
    method: "POST",
  });
}
