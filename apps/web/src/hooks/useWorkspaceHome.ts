import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Folder,
  Home,
  Hourglass,
  MonitorDot,
  PlayCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react";

import { getWorkspace, listRoles, listUsers } from "@/api/admin";
import {
  getAnalyticsApprovals,
  getAnalyticsFindings,
  getAnalyticsOverview,
  listAuditEvents,
} from "@/api/analytics";
import { listApprovals } from "@/api/approvals";
import { listMemory } from "@/api/memory";
import { listPolicies } from "@/api/policies";
import { listProjects, listScopes } from "@/api/projects";
import { listProviderProfiles } from "@/api/providerProfiles";
import { listSessionFindings } from "@/api/findings";
import { listSessionReports } from "@/api/reports";
import {
  getSession,
  getSessionRuntime,
  listSessionEvents,
  listSessionJobs,
  listSessions,
  listSessionTasks,
  listSessionToolCalls,
} from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { formatEventTime, humanizeStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ApiJob,
  ApiProject,
  ApiRuntimeInstance,
  ApiSessionDetail,
  ApiSessionEvent,
  ApiSessionSummary,
  ApiTask,
  ApiToolCall,
  ApiUser,
} from "@/types/api";
import type {
  ApiAnalyticsApprovals,
  ApiAnalyticsFindings,
  ApiAnalyticsOverview,
  ApiAuditEvent,
} from "@/types/analytics-audit";
import type { ApiApproval } from "@/types/approval-queue";
import type { ApiFinding } from "@/types/evidence-review";
import type { ApiMemoryDocument } from "@/types/memory-library";
import type { ApiReport } from "@/types/report-builder";
import type {
  ActivityCategory,
  ApprovalRequest,
  AttentionGroup,
  AttentionItem,
  RuntimeStatus,
  SessionStatus,
  Severity,
  WorkspaceActivityItem,
  WorkspaceMetric,
  WorkspaceNavItem,
  WorkspaceSession,
  WorkspaceSetupItem,
  WorkspaceTone,
} from "@/types/workspace-home";
import { useCurrentUser } from "@/hooks/useAuth";

const ACTIVE_SESSION_STATUSES = new Set(["running", "paused", "planning"]);
const FAILED_STATUSES = new Set(["failed", "timed_out"]);

type QueryError = Error | null;

function count(items: Array<{ key: string; count: number }> | undefined, key: string): number {
  return items?.find((item) => item.key === key)?.count ?? 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
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

function ageLabel(value: string | null | undefined): string {
  if (!value) {
    return "No timestamp";
  }

  const created = new Date(value).getTime();

  if (Number.isNaN(created)) {
    return value;
  }

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60_000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function dateRangeLabel(): string {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  return `${start.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function normalizeSessionStatus(status: string): SessionStatus {
  if (status === "running" || status === "paused") {
    return status;
  }

  return "planning";
}

function normalizeRuntimeStatus(runtime: ApiRuntimeInstance | null | undefined): RuntimeStatus {
  if (!runtime || runtime.status === "stopped" || runtime.status === "stopping") {
    return "offline";
  }

  if (runtime.status === "failed" || runtime.status === "unhealthy") {
    return "unhealthy";
  }

  return "healthy";
}

function normalizeSeverity(value: string | null | undefined): Severity {
  const normalized = value?.toLowerCase();

  if (normalized === "high" || normalized === "medium") {
    return normalized;
  }

  return "low";
}

function commandText(action: Record<string, unknown>): string {
  const args = asRecord(action.arguments);
  const command = args.command;

  if (Array.isArray(command)) {
    return command.map((item) => String(item)).join(" ");
  }

  return asString(action.command, asString(action.tool_name, asString(action.action_type, "approval action")));
}

function projectName(projects: ApiProject[], projectId: string | null | undefined): string {
  if (!projectId) {
    return "Unassigned project";
  }

  return projects.find((project) => project.id === projectId)?.name ?? `Project ${shortId(projectId)}`;
}

function sessionTitle(sessions: ApiSessionSummary[], sessionId: string | null | undefined): string {
  if (!sessionId) {
    return "Unassigned session";
  }

  return sessions.find((session) => session.id === sessionId)?.title ?? `Session ${shortId(sessionId)}`;
}

function userName(users: ApiUser[], userId: string | null | undefined, fallback: string): string {
  if (!userId) {
    return fallback;
  }

  const user = users.find((item) => item.id === userId);

  return user?.name ?? user?.email ?? `User ${shortId(userId)}`;
}

function stepProgress(tasks: ApiTask[]): string {
  const steps = tasks.flatMap((task) => task.steps);

  if (steps.length === 0) {
    return "0 of 0";
  }

  const completed = steps.filter((step) => step.status === "completed").length;

  return `${completed} of ${steps.length}`;
}

function currentStep(session: ApiSessionSummary, tasks: ApiTask[]): string {
  const steps = tasks.flatMap((task) => task.steps);
  const runningStep = steps.find((step) => step.status === "running" || step.status === "awaiting_input");
  const readyStep = steps.find((step) => step.status === "ready" || step.status === "created");

  if (runningStep) {
    return runningStep.title;
  }

  if (readyStep) {
    return readyStep.title;
  }

  if (session.status === "planning") {
    return "Planning";
  }

  return "No current step";
}

function latestEvent(events: ApiSessionEvent[]): ApiSessionEvent | undefined {
  return [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function mapWorkspaceSessions({
  sessions,
  detailsBySession,
  eventsBySession,
  projects,
  runtimesBySession,
  tasksBySession,
  users,
  fallbackOwner,
}: {
  sessions: ApiSessionSummary[];
  detailsBySession: Map<string, ApiSessionDetail>;
  eventsBySession: Map<string, ApiSessionEvent[]>;
  projects: ApiProject[];
  runtimesBySession: Map<string, ApiRuntimeInstance | null>;
  tasksBySession: Map<string, ApiTask[]>;
  users: ApiUser[];
  fallbackOwner: string;
}): WorkspaceSession[] {
  return sessions
    .filter((session) => ACTIVE_SESSION_STATUSES.has(session.status))
    .map((session) => {
      const tasks = tasksBySession.get(session.id) ?? [];
      const detail = detailsBySession.get(session.id);
      const owner = userName(users, detail?.created_by, fallbackOwner);

      return {
        id: session.id,
        title: session.title,
        project: projectName(projects, session.project_id),
        status: normalizeSessionStatus(session.status),
        currentStep: currentStep(session, tasks),
        stepProgress: stepProgress(tasks),
        runtimeStatus: normalizeRuntimeStatus(runtimesBySession.get(session.id)),
        lastEvent: ageLabel(latestEvent(eventsBySession.get(session.id) ?? [])?.created_at),
        owner,
        ownerInitials: initials(owner),
        ownerTone: "teal",
      };
    });
}

function mapApprovalAttentionItem(approval: ApiApproval, sessions: ApiSessionSummary[]): AttentionItem {
  const action = asRecord(approval.requested_action);

  return {
    id: approval.id,
    severity: normalizeSeverity(approval.risk_level),
    title: `${asString(action.tool_name, asString(action.action_type, "Approval"))}: ${commandText(action)}`,
    session: sessionTitle(sessions, approval.session_id),
    project: "",
    age: ageLabel(approval.created_at),
  };
}

function mapFindingAttentionItem(finding: ApiFinding, sessions: ApiSessionSummary[], projects: ApiProject[]): AttentionItem {
  return {
    id: finding.id,
    severity: normalizeSeverity(finding.severity),
    title: finding.title,
    session: sessionTitle(sessions, finding.session_id),
    project: projectName(projects, finding.project_id),
    age: ageLabel(finding.updated_at ?? finding.created_at),
  };
}

function mapJobAttentionItem(job: ApiJob, sessions: ApiSessionSummary[]): AttentionItem {
  return {
    id: job.id,
    severity: "medium",
    title: `${job.type}: ${job.last_error ?? humanizeStatus(job.status)}`,
    session: sessionTitle(sessions, job.session_id),
    project: "",
    age: ageLabel(job.finished_at ?? job.started_at ?? job.created_at),
  };
}

function mapMemoryAttentionItem(memory: ApiMemoryDocument, sessions: ApiSessionSummary[], projects: ApiProject[]): AttentionItem {
  return {
    id: memory.id,
    severity: "medium",
    title: memory.title,
    session: memory.session_id ? sessionTitle(sessions, memory.session_id) : "Workspace memory",
    project: memory.project_id ? projectName(projects, memory.project_id) : "",
    age: ageLabel(memory.updated_at ?? memory.created_at),
  };
}

function mapMetrics({
  activeSessions,
  analyticsApprovals,
  analyticsFindings,
  analyticsOverview,
  failedJobs,
  pendingApprovals,
  reports,
  sessions,
}: {
  activeSessions: WorkspaceSession[];
  analyticsApprovals: ApiAnalyticsApprovals | undefined;
  analyticsFindings: ApiAnalyticsFindings | undefined;
  analyticsOverview: ApiAnalyticsOverview | undefined;
  failedJobs: ApiJob[];
  pendingApprovals: ApiApproval[];
  reports: ApiReport[];
  sessions: ApiSessionSummary[];
}): WorkspaceMetric[] {
  const running = sessions.filter((session) => session.status === "running").length;
  const paused = sessions.filter((session) => session.status === "paused").length;
  const pendingApprovalsCount = analyticsApprovals?.pending_count ?? pendingApprovals.length;
  const highFindings = count(analyticsFindings?.by_severity, "high");
  const mediumFindings = count(analyticsFindings?.by_severity, "medium");
  const candidateFindings =
    count(analyticsFindings?.by_status, "candidate") + count(analyticsFindings?.by_status, "needs_review");
  const renderedReports = reports.filter((report) => report.status === "rendered" || report.status === "final").length;
  const draftReports = reports.filter((report) => report.status === "draft").length;

  return [
    {
      label: "Active sessions",
      value: String(activeSessions.length),
      tone: "teal",
      icon: Activity,
      facts: [
        { value: String(running), label: "running", tone: "teal" },
        { value: String(paused), label: "paused", tone: "slate" },
      ],
    },
    {
      label: "Pending approvals",
      value: String(pendingApprovalsCount),
      tone: pendingApprovalsCount > 0 ? "amber" : "teal",
      icon: Hourglass,
      facts: [
        { value: String(pendingApprovals.filter((approval) => approval.risk_level === "high").length), label: "high", tone: "red" },
        {
          value: String(pendingApprovals.filter((approval) => approval.risk_level === "medium").length),
          label: "medium",
          tone: "amber",
        },
      ],
    },
    {
      label: "Candidate findings",
      value: String(candidateFindings || analyticsFindings?.total || 0),
      tone: candidateFindings > 0 ? "amber" : "teal",
      icon: TriangleAlert,
      facts: [
        { value: String(highFindings), label: "high", tone: "red" },
        { value: String(mediumFindings), label: "medium", tone: "amber" },
      ],
    },
    {
      label: "Failed jobs",
      value: String(analyticsOverview?.job_failure_count ?? failedJobs.length),
      tone: (analyticsOverview?.job_failure_count ?? failedJobs.length) > 0 ? "red" : "teal",
      icon: XCircle,
      facts: [{ value: String(failedJobs.length), label: "visible here", tone: failedJobs.length > 0 ? "red" : "teal" }],
    },
    {
      label: "Report readiness",
      value: String(renderedReports),
      tone: "cyan",
      icon: FileText,
      facts: [
        { value: String(renderedReports), label: "ready", tone: "teal" },
        { value: String(draftReports), label: "draft", tone: "slate" },
      ],
    },
  ];
}

function mapActivityCategory(value: string): ActivityCategory {
  const normalized = value.toLowerCase();

  if (normalized.includes("evidence")) {
    return "Evidence";
  }

  if (normalized.includes("finding")) {
    return "Findings";
  }

  if (normalized.includes("job")) {
    return "Jobs";
  }

  if (normalized.includes("approval")) {
    return "Approvals";
  }

  if (normalized.includes("memory")) {
    return "Memory";
  }

  return "Events";
}

function activityIcon(category: ActivityCategory) {
  switch (category) {
    case "Evidence":
      return FileCheck2;
    case "Findings":
      return ClipboardCheck;
    case "Jobs":
      return CheckCircle2;
    case "Approvals":
      return Hourglass;
    case "Memory":
      return Database;
    default:
      return PlayCircle;
  }
}

function activityTone(category: ActivityCategory, value: string): WorkspaceTone {
  const normalized = value.toLowerCase();

  if (normalized.includes("failed") || normalized.includes("denied")) {
    return "red";
  }

  if (category === "Approvals") {
    return "amber";
  }

  if (category === "Evidence" || category === "Jobs") {
    return "teal";
  }

  if (category === "Memory") {
    return "violet";
  }

  return "blue";
}

function mapSessionActivity(event: ApiSessionEvent, sessions: ApiSessionSummary[]): WorkspaceActivityItem {
  const category = mapActivityCategory(event.event_type);
  const Icon = activityIcon(category);

  return {
    time: formatEventTime(event.created_at),
    label: humanizeStatus(event.event_type),
    detail: Object.keys(event.payload).length > 0 ? JSON.stringify(event.payload) : "Session event persisted",
    context: sessionTitle(sessions, event.session_id),
    actor: event.actor_type === "system" ? "System" : shortId(event.actor_id),
    category,
    tone: activityTone(category, event.event_type),
    icon: Icon,
  };
}

function mapAuditActivity(event: ApiAuditEvent): WorkspaceActivityItem {
  const category = mapActivityCategory(event.action);
  const Icon = category === "Events" ? ShieldCheck : activityIcon(category);

  return {
    time: formatEventTime(event.created_at),
    label: humanizeStatus(event.action),
    detail: `${event.resource_type}:${shortId(event.resource_id)}`,
    context: "Workspace audit",
    actor: event.actor_type === "system" ? "System" : shortId(event.actor_id),
    category,
    tone: activityTone(category, event.action),
    icon: Icon,
  };
}

function mapApprovalRequest(approval: ApiApproval | undefined, sessions: ApiSessionSummary[], projects: ApiProject[]): ApprovalRequest | null {
  if (!approval) {
    return null;
  }

  const action = asRecord(approval.requested_action);
  const actionType = asString(action.tool_name, asString(action.action_type, "approval.action"));
  const session = sessions.find((item) => item.id === approval.session_id);

  return {
    severity: normalizeSeverity(approval.risk_level),
    state: humanizeStatus(approval.status),
    title: `${actionType}: ${commandText(action)}`,
    requestId: approval.id,
    sessionTitle: sessionTitle(sessions, approval.session_id),
    sessionId: approval.session_id,
    project: projectName(projects, session?.project_id),
    requester: approval.requested_by_agent || "Agent",
    requesterRole: "Agent",
    requestedAgo: ageLabel(approval.created_at),
    policyName: "require_approval",
    riskLevel: humanizeStatus(approval.risk_level),
    reasons: [approval.reason],
    constraints: ["Workspace scoped", "CSRF protected", "Audit event recorded"],
    toolDetails: [
      { label: "Tool", value: actionType },
      { label: "Runtime", value: asString(action.runtime_instance_id, "--") },
      { label: "Working dir", value: asString(asRecord(action.arguments).cwd, "/workspace") },
      { label: "Command", value: commandText(action), monospace: true },
      { label: "Timeout", value: `${String(asRecord(action.arguments).timeout_seconds ?? "--")}s` },
      { label: "Status", value: humanizeStatus(approval.status) },
    ],
  };
}

function buildNavItems({
  evidenceCount,
  findingCount,
  pendingApprovalCount,
}: {
  evidenceCount: number;
  findingCount: number;
  pendingApprovalCount: number;
}): WorkspaceNavItem[] {
  return [
    { label: "Workspace", icon: Home, active: true },
    { label: "Projects", icon: Folder },
    { label: "Sessions", icon: MonitorDot },
    { label: "Runtime", icon: Wrench },
    { label: "Approvals", icon: Bell, badge: pendingApprovalCount || undefined },
    { label: "Evidence", icon: FileCheck2, badge: evidenceCount || undefined },
    { label: "Findings", icon: ClipboardCheck, badge: findingCount || undefined },
    { label: "Reports", icon: ScrollText },
    { label: "Memory", icon: Database },
    { label: "Analytics", icon: BarChart3 },
    { label: "Settings", icon: Settings },
  ];
}

function workspaceSetupItems({
  policiesCount,
  projectsCount,
  providerProfilesCount,
  rolesCount,
  scopesCount,
  usersCount,
  workspaceReady,
}: {
  policiesCount: number;
  projectsCount: number;
  providerProfilesCount: number;
  rolesCount: number;
  scopesCount: number;
  usersCount: number;
  workspaceReady: boolean;
}): WorkspaceSetupItem[] {
  return [
    { label: "Workspace is available", complete: workspaceReady },
    { label: "Create a project", complete: projectsCount > 0 },
    { label: "Define a scope", complete: scopesCount > 0 },
    { label: "Create a provider profile", complete: providerProfilesCount > 0 },
    { label: "Create a policy", complete: policiesCount > 0 },
    { label: "Invite a teammate", complete: usersCount > 1 },
    { label: "Default roles are configured", complete: rolesCount > 0 },
  ];
}

export function useWorkspaceHome() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const workspace = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const projects = useQuery({ queryKey: queryKeys.projects.list(), queryFn: listProjects });
  const sessions = useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: listSessions,
    refetchInterval: 15_000,
  });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const providers = useQuery({ queryKey: queryKeys.providerProfiles.list(), queryFn: listProviderProfiles });
  const policies = useQuery({ queryKey: queryKeys.policies.list(), queryFn: listPolicies });
  const analyticsOverview = useQuery({ queryKey: ["analytics", "overview"], queryFn: getAnalyticsOverview });
  const analyticsApprovals = useQuery({ queryKey: ["analytics", "approvals"], queryFn: getAnalyticsApprovals });
  const analyticsFindings = useQuery({ queryKey: ["analytics", "findings"], queryFn: getAnalyticsFindings });
  const pendingApprovals = useQuery({
    queryKey: ["workspace", "approvals", "pending"],
    queryFn: () => listApprovals("pending"),
    refetchInterval: 15_000,
  });
  const auditEvents = useQuery({ queryKey: ["workspace", "audit-events"], queryFn: listAuditEvents });
  const memory = useQuery({ queryKey: ["workspace", "memory"], queryFn: listMemory });

  const sessionItems = pageItems(sessions.data);
  const activeSessionItems = sessionItems.filter((session) => ACTIVE_SESSION_STATUSES.has(session.status));
  const projectItems = pageItems(projects.data);
  const userItems = pageItems(users.data);

  const detailQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: queryKeys.sessions.detail(session.id),
      queryFn: () => getSession(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const taskQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: queryKeys.sessions.tasks(session.id),
      queryFn: () => listSessionTasks(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const eventQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: queryKeys.sessions.events(session.id),
      queryFn: () => listSessionEvents(session.id),
      enabled: Boolean(session.id),
      refetchInterval: 15_000,
    })),
  });
  const runtimeQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: queryKeys.sessions.runtime(session.id),
      queryFn: () => getSessionRuntime(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const jobQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: queryKeys.sessions.jobs(session.id),
      queryFn: () => listSessionJobs(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const toolCallQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: queryKeys.sessions.toolCalls(session.id),
      queryFn: () => listSessionToolCalls(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const findingQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: ["sessions", session.id, "findings"],
      queryFn: () => listSessionFindings(session.id),
      enabled: Boolean(session.id),
    })),
  });
  const reportQueries = useQueries({
    queries: activeSessionItems.map((session) => ({
      queryKey: ["sessions", session.id, "reports"],
      queryFn: () => listSessionReports(session.id),
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

  activeSessionItems.forEach((session, index) => {
    const detail = detailQueries[index]?.data;
    if (detail) {
      detailsBySession.set(session.id, detail);
    }

    tasksBySession.set(session.id, pageItems(taskQueries[index]?.data));
    eventsBySession.set(session.id, pageItems(eventQueries[index]?.data));
    runtimesBySession.set(session.id, runtimeQueries[index]?.data ?? null);
  });

  const fallbackOwner = displayNameFromEmail(currentUser.data?.email);
  const workspaceSessions = mapWorkspaceSessions({
    sessions: sessionItems,
    detailsBySession,
    eventsBySession,
    projects: projectItems,
    runtimesBySession,
    tasksBySession,
    users: userItems,
    fallbackOwner,
  });
  const allJobs = jobQueries.flatMap((query) => pageItems(query.data));
  const allToolCalls = toolCallQueries.flatMap((query) => pageItems(query.data));
  const allFindings = findingQueries.flatMap((query) => pageItems(query.data));
  const allReports = reportQueries.flatMap((query) => pageItems(query.data));
  const allEvents = eventQueries.flatMap((query) => pageItems(query.data));
  const pendingApprovalItems = pageItems(pendingApprovals.data);
  const memoryItems = pageItems(memory.data);
  const failedJobs = allJobs.filter((job) => job.status === "failed");
  const failedToolCalls = allToolCalls.filter((toolCall: ApiToolCall) => FAILED_STATUSES.has(toolCall.status));
  const reviewFindings = allFindings.filter((finding) => finding.status === "candidate" || finding.status === "needs_review");
  const blockedMemory = memoryItems.filter(
    (item) => item.secret_scan_status === "flagged" || item.embedding_status === "blocked",
  );
  const evidenceCount = allEvents.filter((event) => event.event_type.includes("evidence")).length;
  const findingCount = reviewFindings.length || analyticsFindings.data?.total || 0;

  const attentionGroups: AttentionGroup[] = [
    {
      title: "Pending approvals",
      count: pendingApprovalItems.length,
      tone: pendingApprovalItems.length > 0 ? "amber" : "teal",
      items: pendingApprovalItems.slice(0, 3).map((approval) => mapApprovalAttentionItem(approval, sessionItems)),
    },
    {
      title: "Failed tool calls",
      count: failedToolCalls.length + failedJobs.length,
      tone: failedToolCalls.length + failedJobs.length > 0 ? "red" : "teal",
      items: [
        ...failedToolCalls.slice(0, 2).map((toolCall) => ({
          id: toolCall.id,
          severity: "medium" as Severity,
          title: `${toolCall.tool_name}: ${toolCall.error_message ?? humanizeStatus(toolCall.status)}`,
          session: sessionTitle(sessionItems, toolCall.session_id),
          project: "",
          age: ageLabel(toolCall.completed_at ?? toolCall.started_at),
        })),
        ...failedJobs.slice(0, 2).map((job) => mapJobAttentionItem(job, sessionItems)),
      ].slice(0, 3),
    },
    {
      title: "Findings needing review",
      count: reviewFindings.length,
      tone: reviewFindings.length > 0 ? "amber" : "teal",
      items: reviewFindings.slice(0, 3).map((finding) => mapFindingAttentionItem(finding, sessionItems, projectItems)),
    },
    {
      title: "Memory blocked by secret scan",
      count: blockedMemory.length,
      tone: blockedMemory.length > 0 ? "amber" : "teal",
      items: blockedMemory.slice(0, 3).map((item) => mapMemoryAttentionItem(item, sessionItems, projectItems)),
    },
  ];
  const activityItems = [
    ...allEvents.map((event) => mapSessionActivity(event, sessionItems)),
    ...pageItems(auditEvents.data).map(mapAuditActivity),
  ].slice(0, 8);
  const workspaceName = workspace.data?.name ?? "ScopeForge Workspace";
  const role = currentUser.data?.role ?? "Member";
  const userNameLabel = displayNameFromEmail(currentUser.data?.email);
  const scopeCount = scopeQueries.reduce((total, query) => total + pageItems(query.data).length, 0);

  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: ["workspace"] });
    void queryClient.invalidateQueries({ queryKey: ["workspace", "approvals"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list() });
  };

  const childQueriesLoading = [
    ...detailQueries,
    ...taskQueries,
    ...eventQueries,
    ...runtimeQueries,
    ...jobQueries,
    ...toolCallQueries,
    ...findingQueries,
    ...reportQueries,
    ...scopeQueries,
  ].some((query) => query.isLoading);
  const childError = [
    ...detailQueries,
    ...taskQueries,
    ...eventQueries,
    ...runtimeQueries,
    ...jobQueries,
    ...toolCallQueries,
    ...findingQueries,
    ...reportQueries,
    ...scopeQueries,
  ].find((query) => query.error)?.error as QueryError | undefined;

  return {
    activityItems,
    approvalRequest: mapApprovalRequest(pendingApprovalItems[0], sessionItems, projectItems),
    attentionGroups,
    dateRangeLabel: dateRangeLabel(),
    error:
      currentUser.error ??
      workspace.error ??
      projects.error ??
      sessions.error ??
      users.error ??
      roles.error ??
      providers.error ??
      policies.error ??
      analyticsOverview.error ??
      analyticsApprovals.error ??
      analyticsFindings.error ??
      pendingApprovals.error ??
      auditEvents.error ??
      memory.error ??
      childError ??
      null,
    isLoading:
      currentUser.isLoading ||
      workspace.isLoading ||
      projects.isLoading ||
      sessions.isLoading ||
      users.isLoading ||
      roles.isLoading ||
      providers.isLoading ||
      policies.isLoading ||
      analyticsOverview.isLoading ||
      analyticsApprovals.isLoading ||
      analyticsFindings.isLoading ||
      pendingApprovals.isLoading ||
      auditEvents.isLoading ||
      memory.isLoading ||
      childQueriesLoading,
    metrics: mapMetrics({
      activeSessions: workspaceSessions,
      analyticsApprovals: analyticsApprovals.data,
      analyticsFindings: analyticsFindings.data,
      analyticsOverview: analyticsOverview.data,
      failedJobs,
      pendingApprovals: pendingApprovalItems,
      reports: allReports,
      sessions: sessionItems,
    }),
    navItems: buildNavItems({
      evidenceCount,
      findingCount,
      pendingApprovalCount: pendingApprovalItems.length,
    }),
    refetch,
    setupItems: workspaceSetupItems({
      policiesCount: pageItems(policies.data).length,
      projectsCount: projectItems.length,
      providerProfilesCount: pageItems(providers.data).length,
      rolesCount: pageItems(roles.data).length,
      scopesCount: scopeCount,
      usersCount: userItems.length,
      workspaceReady: Boolean(workspace.data?.id),
    }),
    userInitials: initials(currentUser.data?.email),
    userName: userNameLabel,
    userRole: role,
    workspaceInitials: initials(workspaceName),
    workspaceName,
    workspaceSessions,
  };
}
