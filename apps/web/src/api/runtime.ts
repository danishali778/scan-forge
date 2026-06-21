import { apiRequest } from "@/api/client";
import type {
  ApiRuntimeInstance,
  ApiToolCall,
  RuntimeFileContentResponse,
  RuntimeFileListResponse,
  RuntimeFileWriteRequest,
  RuntimeFileWriteResponse,
  TerminalCommandRequest,
} from "@/types/api";

export function startSessionRuntime(sessionId: string): Promise<ApiRuntimeInstance> {
  return apiRequest<ApiRuntimeInstance>(`/sessions/${sessionId}/runtime/start`, {
    method: "POST",
  });
}

export function stopSessionRuntime(sessionId: string): Promise<ApiRuntimeInstance> {
  return apiRequest<ApiRuntimeInstance>(`/sessions/${sessionId}/runtime/stop`, {
    method: "POST",
  });
}

export function createTerminalToolCall(sessionId: string, request: TerminalCommandRequest): Promise<ApiToolCall> {
  return apiRequest<ApiToolCall>(`/sessions/${sessionId}/tool-calls/terminal`, {
    method: "POST",
    body: request,
  });
}

export function listRuntimeFiles(sessionId: string, path = "/workspace"): Promise<RuntimeFileListResponse> {
  return apiRequest<RuntimeFileListResponse>(`/sessions/${sessionId}/files`, {
    query: { path },
  });
}

export function readRuntimeFile(sessionId: string, path: string): Promise<RuntimeFileContentResponse> {
  return apiRequest<RuntimeFileContentResponse>(`/sessions/${sessionId}/files/content`, {
    query: { path },
  });
}

export function writeRuntimeFile(sessionId: string, request: RuntimeFileWriteRequest): Promise<RuntimeFileWriteResponse> {
  return apiRequest<RuntimeFileWriteResponse>(`/sessions/${sessionId}/files/content`, {
    method: "PUT",
    body: request,
  });
}
