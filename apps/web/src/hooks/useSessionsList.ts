import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveSession,
  getSession,
  getSessionRuntime,
  listSessionEvents,
  listSessions,
  listSessionTasks,
  pauseSession,
  resumeSession,
  startSession,
  stopSession,
} from "@/api/sessions";
import { listApprovals } from "@/api/approvals";
import { listPolicies } from "@/api/policies";
import { listProjects, listScopes } from "@/api/projects";
import { listProviderProfiles } from "@/api/providerProfiles";
import { listSessionEvidence } from "@/api/evidence";
import { listSessionFindings } from "@/api/findings";
import { getAnalyticsApprovals, getAnalyticsSessions, getAnalyticsTools } from "@/api/analytics";
import { listUsers } from "@/api/admin";
import { pageItems } from "@/lib/apiPages";
import { formatEventTime, humanizeStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ApiPolicy,
  ApiProject,
  ApiProviderProfile,
  ApiRuntimeInstance,
  ApiScope,
  ApiSessionDetail,
  ApiSessionEvent,
  ApiSessionSummary,
  ApiTask,
  ApiUser,
} from "@/types/api";
import type { ApiAnalyticsApprovals, ApiAnalyticsSessions, ApiAnalyticsTools } from "@/types/analytics-audit";
import type { ApiApproval } from "@/types/approval-queue";
import type { ApiEvidence, ApiFinding } from "@/types/evidence-review";
import type {
  SessionLatestEvent,
  SessionListStatus,
  SessionOverviewStatus,
  SessionStatusTab,
  SessionsListSession,
  SessionsOverviewMetric,
} from "@/types/sessions-list";
import { useCurrentUser } from "@/hooks/useAuth";

const SESSION_STATUSES: SessionListStatus[] = [
  "draft",
  "planning",
  "running",
  "awaiting_approval",
  "paused",
  "completed",
  "failed",
  "stopped",
  "archived",
];

const statusColors: Record<SessionListStatus, string> = {
  draft: "bg-indigo-300",
  planning: "bg-blue-400",
  running: "bg-teal-500",
  awaiting_approval: "bg-amber-400",
  paused: "bg-slate-400",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  stopped: "bg-slate-500",
  archived: "bg-slate-300",
};

function normalizeStatus(value: string): SessionListStatus {
  return SESSION_STATUSES.includes(value as SessionListStatus) ? (value as SessionListStatus) : "draft";
}

function initials(value: string | null | undefined, fallback = "SF"): string {
  const source = value?.trim() || fallback;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  return (parts[0]?.[0] ?? "S").concat(parts[1]?.[0] ?? parts[0]?.[1] ?? "F").toUpperCase();
}

function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return "Workspace user";
  }

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortId(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : "--";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Backend record";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDatePart(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function projectName(projects: ApiProject[], projectId: string): string {
  return projects.find((project) => project.id === projectId)?.name ?? `Project ${shortId(projectId)}`;
}

function scopeName(scopes: ApiScope[], scopeId: string): string {
  return scopes.find((scope) => scope.id === scopeId)?.name ?? `Scope ${shortId(scopeId)}`;
}

function providerName(providers: ApiProviderProfile[], profileId: string | null | undefined): string {
  if (!profileId) {
    return "No provider selected";
  }

  return providers.find((provider) => provider.id === profileId)?.name ?? `Provider ${shortId(profileId)}`;
}

function policyName(policies: ApiPolicy[], policyId: string | null | undefined): string {
  if (!policyId) {
    return "No policy selected";
  }

  return policies.find((policy) => policy.id === policyId)?.name ?? `Policy ${shortId(policyId)}`;
}

function ownerForSession(users: ApiUser[], createdBy: string | null | undefined, fallbackEmail: string | null | undefined) {
  const user = users.find((item) => item.id === createdBy);
  const name = user?.name ?? user?.email ?? displayNameFromEmail(fallbackEmail);

  return {
    id: user?.id ?? createdBy ?? "current-user",
    name,
    initials: initials(user?.name ?? user?.email ?? fallbackEmail),
    role: user?.role ?? "Operator",
    color: "teal" as const,
  };
}

function runtimeState(runtime: ApiRuntimeInstance | null | undefined): SessionsListSession["runtime"] {
  if (!runtime) {
    return { state: "idle", label: "-" };
  }

  if (runtime.status === "running" || runtime.status === "starting") {
    return { state: "healthy", label: runtime.status === "starting" ? "Starting" : "Healthy" };
  }

  if (runtime.status === "failed" || runtime.status === "unhealthy") {
    return { state: "failed", label: humanizeStatus(runtime.status) };
  }

  return { state: "stopped", label: humanizeStatus(runtime.status) };
}

function latestEvent(events: ApiSessionEvent[]): ApiSessionEvent | undefined {
  return [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function eventTone(eventType: string): SessionLatestEvent["tone"] {
  const normalized = eventType.toLowerCase();

  if (normalized.includes("approval") || normalized.includes("failed")) {
    return "amber";
  }

  if (normalized.includes("created") || normalized.includes("finished") || normalized.includes("completed")) {
    return "teal";
  }

  return "slate";
}

function latestEvents(events: ApiSessionEvent[]): SessionLatestEvent[] {
  return [...events]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((event) => ({
      time: formatEventTime(event.created_at),
      label: humanizeStatus(event.event_type),
      detail: Object.keys(event.payload).length > 0 ? JSON.stringify(event.payload) : "Session event persisted",
      tone: eventTone(event.event_type),
    }));
}

function progress(tasks: ApiTask[]): SessionsListSession["progress"] {
  const taskTotal = tasks.length;
  const taskDone = tasks.filter((task) => task.status === "completed").length;
  const steps = tasks.flatMap((task) => task.steps);
  const stepTotal = steps.length;
  const stepDone = steps.filter((step) => step.status === "completed").length;
  const currentTask =
    tasks.find((task) => task.status === "running") ??
    tasks.find((task) => task.status === "planned" || task.status === "created" || task.status === "blocked") ??
    tasks[0];

  return {
    currentTask: currentTask?.title ?? "Not started",
    taskProgressLabel: `${taskDone} of ${taskTotal} tasks`,
    taskProgressPercent: taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0,
    stepProgressLabel: `${stepDone} of ${stepTotal} steps`,
    stepProgressPercent: stepTotal > 0 ? Math.round((stepDone / stepTotal) * 100) : 0,
  };
}

function currentStep(session: ApiSessionSummary, tasks: ApiTask[]): string {
  const steps = tasks.flatMap((task) => task.steps);
  const activeStep =
    steps.find((step) => step.status === "running" || step.status === "awaiting_input") ??
    steps.find((step) => step.status === "ready" || step.status === "created");

  if (activeStep) {
    return activeStep.title;
  }

  if (session.status === "planning") {
    return "Planning";
  }

  if (session.status === "draft") {
    return "Not started";
  }

  return "No current step";
}

function countBySession<T extends { session_id: string }>(items: T[], sessionId: string): number {
  return items.filter((item) => item.session_id === sessionId).length;
}

function mapSessions({
  approvals,
  details,
  evidence,
  events,
  fallbackEmail,
  findings,
  policies,
  projects,
  providers,
  runtimes,
  scopes,
  sessions,
  tasks,
  users,
}: {
  approvals: ApiApproval[];
  details: Map<string, ApiSessionDetail>;
  evidence: Map<string, ApiEvidence[]>;
  events: Map<string, ApiSessionEvent[]>;
  fallbackEmail: string | null | undefined;
  findings: Map<string, ApiFinding[]>;
  policies: ApiPolicy[];
  projects: ApiProject[];
  providers: ApiProviderProfile[];
  runtimes: Map<string, ApiRuntimeInstance | null>;
  scopes: ApiScope[];
  sessions: ApiSessionSummary[];
  tasks: Map<string, ApiTask[]>;
  users: ApiUser[];
}): SessionsListSession[] {
  return sessions.map((session) => {
    const detail = details.get(session.id);
    const sessionTasks = tasks.get(session.id) ?? [];
    const sessionEvents = events.get(session.id) ?? [];
    const lastEvent = latestEvent(sessionEvents);
    const sessionProgress = progress(sessionTasks);

    return {
      id: session.id,
      title: session.title,
      project: projectName(projects, session.project_id),
      scope: scopeName(scopes, session.scope_id),
      status: normalizeStatus(session.status),
      currentStep: currentStep(session, sessionTasks),
      taskProgress: sessionProgress.taskProgressLabel,
      runtime: runtimeState(runtimes.get(session.id)),
      approvals: countBySession(approvals, session.id),
      evidence: evidence.get(session.id)?.length ?? 0,
      findings: findings.get(session.id)?.length ?? 0,
      lastEventTime: lastEvent ? formatEventTime(lastEvent.created_at) : "No events",
      lastEventDate: lastEvent ? formatDatePart(lastEvent.created_at) : "",
      owner: ownerForSession(users, detail?.created_by, fallbackEmail),
      createdAt: formatDateTime(lastEvent?.created_at),
      updatedAt: formatDateTime(lastEvent?.created_at),
      objective: detail?.objective ?? "No objective available.",
      providerProfile: providerName(providers, session.provider_profile_id),
      policy: policyName(policies, session.policy_id),
      progress: sessionProgress,
      latestEvents: latestEvents(sessionEvents),
    };
  });
}

function statusTabs(sessions: SessionsListSession[]): SessionStatusTab[] {
  return [
    { key: "all", label: "All", count: sessions.length },
    ...SESSION_STATUSES.map((status) => ({
      key: status,
      label: humanizeStatus(status),
      count: sessions.filter((session) => session.status === status).length,
    })),
  ];
}

function overviewStatuses(sessions: SessionsListSession[], analytics: ApiAnalyticsSessions | undefined): SessionOverviewStatus[] {
  const total = analytics?.total ?? sessions.length;
  const counts = new Map<string, number>((analytics?.status_counts ?? []).map((item) => [item.key, item.count]));

  return SESSION_STATUSES.map((status) => {
    const count = counts.get(status) ?? sessions.filter((session) => session.status === status).length;

    return {
      status,
      label: humanizeStatus(status),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      colorClass: statusColors[status],
    };
  });
}

function secondsLabel(value: number | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function countStatus(items: Array<{ key: string; count: number }> | undefined, key: string): number {
  return items?.find((item) => item.key === key)?.count ?? 0;
}

function overviewMetrics(
  sessionAnalytics: ApiAnalyticsSessions | undefined,
  toolAnalytics: ApiAnalyticsTools | undefined,
  approvalAnalytics: ApiAnalyticsApprovals | undefined,
): SessionsOverviewMetric[] {
  const succeededTools = countStatus(toolAnalytics?.status_counts, "succeeded");
  const failedTools = countStatus(toolAnalytics?.status_counts, "failed");
  const toolTotal = toolAnalytics?.total ?? succeededTools + failedTools;
  const successRate = toolTotal > 0 ? Math.round((succeededTools / toolTotal) * 100) : 0;
  const failureRate = toolTotal > 0 ? Math.round((failedTools / toolTotal) * 100) : 0;
  const approvalTotal = approvalAnalytics?.total ?? 0;
  const approved = approvalAnalytics?.approved_count ?? countStatus(approvalAnalytics?.status_counts, "approved");
  const denied = approvalAnalytics?.denied_count ?? countStatus(approvalAnalytics?.status_counts, "denied");

  return [
    {
      label: "Average duration",
      value: secondsLabel(sessionAnalytics?.average_duration_seconds),
      helper: `Across ${sessionAnalytics?.completed_count ?? 0} completed sessions`,
      trend: [36, 58, 44, 62, 49, 71, 52, 60],
      tone: "teal",
    },
    {
      label: "Tool calls",
      value: String(toolTotal),
      helper: `Success rate ${successRate}%`,
      trend: [42, 48, 53, 56, 62, 68, 73, 80],
      tone: successRate >= 80 ? "teal" : "red",
    },
    {
      label: "Approvals",
      value: String(approvalTotal),
      helper: `${approved} approved, ${denied} denied`,
      tone: "slate",
    },
    {
      label: "Jobs / failures",
      value: `${failureRate}%`,
      helper: `${failedTools} failed tool calls`,
      trend: [18, 21, 19, 24, 17, 20, 18, 23],
      tone: failureRate > 0 ? "red" : "teal",
    },
  ];
}

export function useSessionsList() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const sessions = useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: listSessions,
    refetchInterval: 15_000,
  });
  const projects = useQuery({ queryKey: queryKeys.projects.list(), queryFn: listProjects });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });
  const providers = useQuery({ queryKey: queryKeys.providerProfiles.list(), queryFn: listProviderProfiles });
  const policies = useQuery({ queryKey: queryKeys.policies.list(), queryFn: listPolicies });
  const approvals = useQuery({ queryKey: ["sessions-list", "approvals"], queryFn: () => listApprovals() });
  const analyticsSessions = useQuery({ queryKey: ["analytics", "sessions"], queryFn: getAnalyticsSessions });
  const analyticsTools = useQuery({ queryKey: ["analytics", "tools"], queryFn: getAnalyticsTools });
  const analyticsApprovals = useQuery({ queryKey: ["analytics", "approvals"], queryFn: getAnalyticsApprovals });

  const sessionItems = pageItems(sessions.data);
  const projectItems = pageItems(projects.data);

  const detailQueries = useQueries({
    queries: sessionItems.map((session) => ({
      queryKey: queryKeys.sessions.detail(session.id),
      queryFn: () => getSession(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const taskQueries = useQueries({
    queries: sessionItems.map((session) => ({
      queryKey: queryKeys.sessions.tasks(session.id),
      queryFn: () => listSessionTasks(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const eventQueries = useQueries({
    queries: sessionItems.map((session) => ({
      queryKey: queryKeys.sessions.events(session.id),
      queryFn: () => listSessionEvents(session.id),
      enabled: Boolean(session.id),
      refetchInterval: 15_000,
    })),
  });
  const runtimeQueries = useQueries({
    queries: sessionItems.map((session) => ({
      queryKey: queryKeys.sessions.runtime(session.id),
      queryFn: () => getSessionRuntime(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const evidenceQueries = useQueries({
    queries: sessionItems.map((session) => ({
      queryKey: ["sessions", session.id, "evidence"],
      queryFn: () => listSessionEvidence(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const findingQueries = useQueries({
    queries: sessionItems.map((session) => ({
      queryKey: ["sessions", session.id, "findings"],
      queryFn: () => listSessionFindings(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const scopeQueries = useQueries({
    queries: projectItems.map((project) => ({
      queryKey: queryKeys.projects.scopes(project.id),
      queryFn: () => listScopes(project.id),
      enabled: Boolean(project.id),
    })),
  });

  const detailsBySession = new Map<string, ApiSessionDetail>();
  const tasksBySession = new Map<string, ApiTask[]>();
  const eventsBySession = new Map<string, ApiSessionEvent[]>();
  const runtimesBySession = new Map<string, ApiRuntimeInstance | null>();
  const evidenceBySession = new Map<string, ApiEvidence[]>();
  const findingsBySession = new Map<string, ApiFinding[]>();

  sessionItems.forEach((session, index) => {
    const detail = detailQueries[index]?.data;
    if (detail) {
      detailsBySession.set(session.id, detail);
    }

    tasksBySession.set(session.id, pageItems(taskQueries[index]?.data));
    eventsBySession.set(session.id, pageItems(eventQueries[index]?.data));
    runtimesBySession.set(session.id, runtimeQueries[index]?.data ?? null);
    evidenceBySession.set(session.id, pageItems(evidenceQueries[index]?.data));
    findingsBySession.set(session.id, pageItems(findingQueries[index]?.data));
  });

  const allScopes = scopeQueries.flatMap((query) => pageItems(query.data));
  const mappedSessions = mapSessions({
    approvals: pageItems(approvals.data),
    details: detailsBySession,
    evidence: evidenceBySession,
    events: eventsBySession,
    fallbackEmail: currentUser.data?.email,
    findings: findingsBySession,
    policies: pageItems(policies.data),
    projects: projectItems,
    providers: pageItems(providers.data),
    runtimes: runtimesBySession,
    scopes: allScopes,
    sessions: sessionItems,
    tasks: tasksBySession,
    users: pageItems(users.data),
  });

  const invalidateSessions = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list() });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    sessionItems.forEach((session) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(session.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.events(session.id) });
    });
  };

  const lifecycleMutation = useMutation({
    mutationFn: ({ action, sessionId }: { action: "start" | "pause" | "resume" | "stop" | "archive"; sessionId: string }) => {
      switch (action) {
        case "start":
          return startSession(sessionId);
        case "pause":
          return pauseSession(sessionId);
        case "resume":
          return resumeSession(sessionId);
        case "archive":
          return archiveSession(sessionId);
        case "stop":
        default:
          return stopSession(sessionId);
      }
    },
    onSuccess: invalidateSessions,
  });

  const childQueriesLoading = [
    ...detailQueries,
    ...taskQueries,
    ...eventQueries,
    ...runtimeQueries,
    ...evidenceQueries,
    ...findingQueries,
    ...scopeQueries,
  ].some((query) => query.isLoading);
  const childError = [
    ...detailQueries,
    ...taskQueries,
    ...eventQueries,
    ...runtimeQueries,
    ...evidenceQueries,
    ...findingQueries,
    ...scopeQueries,
  ].find((query) => query.error)?.error as Error | undefined;

  return {
    error:
      currentUser.error ??
      sessions.error ??
      projects.error ??
      users.error ??
      providers.error ??
      policies.error ??
      approvals.error ??
      analyticsSessions.error ??
      analyticsTools.error ??
      analyticsApprovals.error ??
      childError ??
      lifecycleMutation.error ??
      null,
    isActionPending: lifecycleMutation.isPending,
    isLoading:
      currentUser.isLoading ||
      sessions.isLoading ||
      projects.isLoading ||
      users.isLoading ||
      providers.isLoading ||
      policies.isLoading ||
      approvals.isLoading ||
      analyticsSessions.isLoading ||
      analyticsTools.isLoading ||
      analyticsApprovals.isLoading ||
      childQueriesLoading,
    lifecycle: {
      archive: (sessionId: string) => lifecycleMutation.mutate({ action: "archive", sessionId }),
      pause: (sessionId: string) => lifecycleMutation.mutate({ action: "pause", sessionId }),
      resume: (sessionId: string) => lifecycleMutation.mutate({ action: "resume", sessionId }),
      start: (sessionId: string) => lifecycleMutation.mutate({ action: "start", sessionId }),
      stop: (sessionId: string) => lifecycleMutation.mutate({ action: "stop", sessionId }),
    },
    notificationCount: pageItems(approvals.data).filter((approval) => approval.status === "pending").length,
    overviewMetrics: overviewMetrics(analyticsSessions.data, analyticsTools.data, analyticsApprovals.data),
    overviewStatuses: overviewStatuses(mappedSessions, analyticsSessions.data),
    sessions: mappedSessions,
    statusTabs: statusTabs(mappedSessions),
    userInitials: initials(currentUser.data?.email),
  };
}
