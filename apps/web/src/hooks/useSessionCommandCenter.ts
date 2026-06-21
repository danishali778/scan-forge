import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSession,
  getSessionRuntime,
  listSessionEvents,
  listSessionJobs,
  listSessionTasks,
  listSessionToolCalls,
  pauseSession,
  stopSession,
} from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { queryKeys } from "@/lib/queryKeys";

export function useSessionCommandCenter(sessionId: string | undefined) {
  const enabled = Boolean(sessionId);
  const resolvedSessionId = sessionId ?? "";

  const session = useQuery({
    queryKey: queryKeys.sessions.detail(resolvedSessionId),
    queryFn: () => getSession(resolvedSessionId),
    enabled,
  });

  const tasks = useQuery({
    queryKey: queryKeys.sessions.tasks(resolvedSessionId),
    queryFn: () => listSessionTasks(resolvedSessionId),
    enabled,
  });

  const jobs = useQuery({
    queryKey: queryKeys.sessions.jobs(resolvedSessionId),
    queryFn: () => listSessionJobs(resolvedSessionId),
    enabled,
  });

  const events = useQuery({
    queryKey: queryKeys.sessions.events(resolvedSessionId),
    queryFn: () => listSessionEvents(resolvedSessionId),
    enabled,
    refetchInterval: 5_000,
  });

  const runtime = useQuery({
    queryKey: queryKeys.sessions.runtime(resolvedSessionId),
    queryFn: () => getSessionRuntime(resolvedSessionId),
    enabled,
  });

  const toolCalls = useQuery({
    queryKey: queryKeys.sessions.toolCalls(resolvedSessionId),
    queryFn: () => listSessionToolCalls(resolvedSessionId),
    enabled,
  });

  return {
    session: session.data,
    tasks: pageItems(tasks.data),
    jobs: pageItems(jobs.data),
    events: pageItems(events.data),
    runtime: runtime.data ?? null,
    toolCalls: pageItems(toolCalls.data),
    isLoading: session.isLoading || tasks.isLoading,
    error: session.error ?? tasks.error ?? jobs.error ?? events.error ?? runtime.error ?? toolCalls.error,
  };
}

export function useSessionControls(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const resolvedSessionId = sessionId ?? "";

  const invalidateSession = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(resolvedSessionId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.events(resolvedSessionId) });
  };

  const pause = useMutation({
    mutationFn: () => pauseSession(resolvedSessionId),
    onSuccess: invalidateSession,
  });

  const stop = useMutation({
    mutationFn: () => stopSession(resolvedSessionId),
    onSuccess: invalidateSession,
  });

  return {
    pause,
    stop,
    isPending: pause.isPending || stop.isPending,
  };
}
