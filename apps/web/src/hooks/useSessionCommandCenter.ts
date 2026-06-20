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

export function useSessionCommandCenter(sessionId: string | undefined) {
  const enabled = Boolean(sessionId);

  const session = useQuery({
    queryKey: ["sessions", sessionId],
    queryFn: () => getSession(sessionId as string),
    enabled,
  });

  const tasks = useQuery({
    queryKey: ["sessions", sessionId, "tasks"],
    queryFn: () => listSessionTasks(sessionId as string),
    enabled,
  });

  const jobs = useQuery({
    queryKey: ["sessions", sessionId, "jobs"],
    queryFn: () => listSessionJobs(sessionId as string),
    enabled,
  });

  const events = useQuery({
    queryKey: ["sessions", sessionId, "events"],
    queryFn: () => listSessionEvents(sessionId as string),
    enabled,
    refetchInterval: 5_000,
  });

  const runtime = useQuery({
    queryKey: ["sessions", sessionId, "runtime"],
    queryFn: () => getSessionRuntime(sessionId as string),
    enabled,
  });

  const toolCalls = useQuery({
    queryKey: ["sessions", sessionId, "tool-calls"],
    queryFn: () => listSessionToolCalls(sessionId as string),
    enabled,
  });

  return {
    session: session.data,
    tasks: tasks.data?.items ?? [],
    jobs: jobs.data?.items ?? [],
    events: events.data?.items ?? [],
    runtime: runtime.data ?? null,
    toolCalls: toolCalls.data?.items ?? [],
    isLoading: session.isLoading || tasks.isLoading,
    error: session.error ?? tasks.error ?? jobs.error ?? events.error ?? runtime.error ?? toolCalls.error,
  };
}

export function useSessionControls(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidateSession = () => {
    void queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
  };

  const pause = useMutation({
    mutationFn: () => pauseSession(sessionId as string),
    onSuccess: invalidateSession,
  });

  const stop = useMutation({
    mutationFn: () => stopSession(sessionId as string),
    onSuccess: invalidateSession,
  });

  return {
    pause,
    stop,
    isPending: pause.isPending || stop.isPending,
  };
}
