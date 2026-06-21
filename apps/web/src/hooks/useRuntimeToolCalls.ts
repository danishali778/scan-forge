import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTerminalToolCall,
  listRuntimeFiles,
  readRuntimeFile,
  startSessionRuntime,
  stopSessionRuntime,
  writeRuntimeFile,
} from "@/api/runtime";
import {
  getSession,
  getSessionRuntime,
  listSessionEvents,
  listSessions,
  listSessionToolCalls,
} from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { queryKeys } from "@/lib/queryKeys";
import type { RuntimeFileWriteRequest, TerminalCommandRequest } from "@/types/api";

const ACTIVE_SESSION_STATUSES = new Set(["running", "planning", "paused", "awaiting_approval"]);

function resolveSessionId(requestedSessionId: string | null | undefined, sessionIds: { id: string; status: string }[]) {
  if (requestedSessionId && sessionIds.some((session) => session.id === requestedSessionId)) {
    return requestedSessionId;
  }

  return sessionIds.find((session) => ACTIVE_SESSION_STATUSES.has(session.status))?.id ?? sessionIds[0]?.id ?? "";
}

function requireSessionId(sessionId: string) {
  if (!sessionId) {
    throw new Error("Select a session before using runtime actions.");
  }

  return sessionId;
}

export function useRuntimeToolCalls(requestedSessionId: string | null | undefined) {
  const queryClient = useQueryClient();

  const sessions = useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: listSessions,
  });

  const sessionItems = pageItems(sessions.data);
  const selectedSessionId = resolveSessionId(requestedSessionId, sessionItems);
  const hasSession = Boolean(selectedSessionId);

  const session = useQuery({
    queryKey: queryKeys.sessions.detail(selectedSessionId),
    queryFn: () => getSession(selectedSessionId),
    enabled: hasSession,
  });

  const runtime = useQuery({
    queryKey: queryKeys.sessions.runtime(selectedSessionId),
    queryFn: () => getSessionRuntime(selectedSessionId),
    enabled: hasSession,
    refetchInterval: 5_000,
  });

  const toolCalls = useQuery({
    queryKey: queryKeys.sessions.toolCalls(selectedSessionId),
    queryFn: () => listSessionToolCalls(selectedSessionId),
    enabled: hasSession,
    refetchInterval: 5_000,
  });

  const events = useQuery({
    queryKey: queryKeys.sessions.events(selectedSessionId),
    queryFn: () => listSessionEvents(selectedSessionId),
    enabled: hasSession,
    refetchInterval: 5_000,
  });

  const runtimeFiles = useQuery({
    queryKey: queryKeys.sessions.files(selectedSessionId, "/workspace"),
    queryFn: () => listRuntimeFiles(selectedSessionId, "/workspace"),
    enabled: hasSession && runtime.data?.status === "running",
  });

  const invalidateRuntimeState = () => {
    if (!selectedSessionId) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(selectedSessionId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.runtime(selectedSessionId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.toolCalls(selectedSessionId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.events(selectedSessionId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.files(selectedSessionId, "/workspace") });
  };

  const startRuntime = useMutation({
    mutationFn: () => startSessionRuntime(requireSessionId(selectedSessionId)),
    onSuccess: invalidateRuntimeState,
  });

  const stopRuntime = useMutation({
    mutationFn: () => stopSessionRuntime(requireSessionId(selectedSessionId)),
    onSuccess: invalidateRuntimeState,
  });

  const requestTerminalCommand = useMutation({
    mutationFn: (request: TerminalCommandRequest) => createTerminalToolCall(requireSessionId(selectedSessionId), request),
    onSuccess: invalidateRuntimeState,
  });

  const writeFile = useMutation({
    mutationFn: (request: RuntimeFileWriteRequest) => writeRuntimeFile(requireSessionId(selectedSessionId), request),
    onSuccess: invalidateRuntimeState,
  });

  const refetchAll = () => {
    void sessions.refetch();
    void session.refetch();
    void runtime.refetch();
    void toolCalls.refetch();
    void events.refetch();
    void runtimeFiles.refetch();
  };

  return {
    selectedSessionId,
    sessions: sessionItems,
    session: session.data,
    runtime: runtime.data ?? null,
    toolCalls: pageItems(toolCalls.data),
    events: pageItems(events.data),
    files: runtimeFiles.data ?? null,
    isLoading: sessions.isLoading || (hasSession && session.isLoading),
    error: sessions.error ?? session.error ?? runtime.error ?? toolCalls.error ?? events.error,
    filesError: runtimeFiles.error,
    startRuntime,
    stopRuntime,
    requestTerminalCommand,
    writeFile,
    refetchAll,
    isMutating: startRuntime.isPending || stopRuntime.isPending || requestTerminalCommand.isPending || writeFile.isPending,
  };
}

export function useRuntimeFileContent(sessionId: string | undefined, path: string | undefined) {
  const resolvedSessionId = sessionId ?? "";
  const resolvedPath = path ?? "";

  return useQuery({
    queryKey: queryKeys.sessions.fileContent(resolvedSessionId, resolvedPath),
    queryFn: () => readRuntimeFile(resolvedSessionId, resolvedPath),
    enabled: Boolean(resolvedSessionId && resolvedPath),
  });
}
