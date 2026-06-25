import { useQueries, useQuery } from "@tanstack/react-query";

import { getWorkspace, listRoles, listUsers } from "@/api/admin";
import { listPolicies } from "@/api/policies";
import { listProjects } from "@/api/projects";
import { listProviderProfiles } from "@/api/providerProfiles";
import { listSessions } from "@/api/sessions";
import { listTargets } from "@/api/targets";
import { pageItems } from "@/lib/apiPages";
import { humanizeStatus } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import type { ProjectDetailsValues } from "@/components/new-assessment/ProjectDetailsPanel";
import type { ApiPolicy, ApiProviderProfile, ApiProject, ApiRole, ApiSessionSummary, ApiUser } from "@/types/api";
import type {
  ChecklistItem,
  GuardrailSection,
  ReadinessItem,
  RecentDraft,
  SetupStep,
  Target,
} from "@/types/new-assessment";
import { useCurrentUser } from "@/hooks/useAuth";

const roleColors = ["bg-teal-700", "bg-amber-500", "bg-emerald-600", "bg-cyan-700", "bg-slate-400"];

export interface SelectOption {
  id: string;
  label: string;
  helper?: string;
}

export interface RolePermissionSummary {
  role: string;
  count: number;
  color: string;
}

interface UseNewAssessmentSetupInput {
  details: ProjectDetailsValues;
  targets: Target[];
  selectedPolicyId: string | null;
  selectedProviderId: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
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

function initials(value: string | null | undefined, fallback = "SF"): string {
  const source = value?.trim() || fallback;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  return (parts[0]?.[0] ?? "S").concat(parts[1]?.[0] ?? parts[0]?.[1] ?? "F").toUpperCase();
}

function activeFirst<T extends { status: string }>(items: T[]): T | undefined {
  return items.find((item) => item.status === "active") ?? items[0];
}

function sessionForProject(sessions: ApiSessionSummary[], projectId: string): ApiSessionSummary | undefined {
  return sessions.find((session) => session.project_id === projectId);
}

function mapRecentDrafts({
  projects,
  sessions,
  targetCounts,
}: {
  projects: ApiProject[];
  sessions: ApiSessionSummary[];
  targetCounts: Map<string, number>;
}): RecentDraft[] {
  return projects.slice(0, 4).map((project) => {
    const session = sessionForProject(sessions, project.id);

    return {
      name: project.name,
      updatedAt: session ? `Session ${session.id.slice(0, 8)}` : "Backend project",
      targets: targetCounts.get(project.id) ?? 0,
      status: humanizeStatus(session?.status ?? project.status),
      sessionId: session?.id,
    };
  });
}

function mapProviderOptions(providers: ApiProviderProfile[]): SelectOption[] {
  return providers.map((provider) => ({
    id: provider.id,
    label: provider.name,
    helper: `${humanizeStatus(provider.provider_type)} - ${provider.has_credential ? "credential present" : "missing credential"}`,
  }));
}

function mapPolicyOptions(policies: ApiPolicy[]): SelectOption[] {
  return policies.map((policy) => ({
    id: policy.id,
    label: policy.name,
    helper: `${humanizeStatus(policy.status)} - ${policy.description ?? "Policy JSON rules"}`,
  }));
}

function roleSummaries(roles: ApiRole[], users: ApiUser[], currentRole: string | null | undefined): RolePermissionSummary[] {
  const sourceRoles: Array<{ id: string; name: string }> =
    roles.length > 0 ? roles.map((role) => ({ id: role.id, name: role.name })) : currentRole ? [{ id: currentRole, name: currentRole }] : [];

  return sourceRoles.slice(0, 5).map((role, index) => {
    const roleName = role.name;
    const count = users.filter((user) => user.role === roleName || user.role_id === role.id).length;

    return {
      role: roleName,
      count,
      color: roleColors[index % roleColors.length],
    };
  });
}

function policyValue(policy: ApiPolicy | undefined, key: string, fallback: string): string {
  if (!policy) {
    return fallback;
  }

  return asText(policy.rules[key], fallback);
}

function buildGuardrails({
  policy,
  provider,
  targets,
  workspaceSettings,
}: {
  policy: ApiPolicy | undefined;
  provider: ApiProviderProfile | undefined;
  targets: Target[];
  workspaceSettings: Record<string, unknown>;
}): GuardrailSection[] {
  const excludedTargets = targets
    .filter((target) => target.status === "Excluded" && target.value.trim().length > 0)
    .map((target) => target.value.trim());
  const testingWindow = asRecord(workspaceSettings.testing_window ?? workspaceSettings.allowed_testing_window);

  return [
    {
      title: "Scope guardrails",
      rows: [
        { label: "Scope type", value: policyValue(policy, "scope_type", "Authorized assessment") },
        { label: "Out-of-scope", value: policyValue(policy, "out_of_scope", "No social engineering, DoS/DDoS, physical testing") },
        { label: "Data handling", value: policyValue(policy, "data_handling", "No production data, no data destruction") },
        { label: "Credential use", value: policyValue(policy, "credential_use", "Only provided test accounts") },
      ],
    },
    {
      title: "Allowed testing windows",
      rows: [
        { label: "Days", value: asText(testingWindow.days, "Workspace default") },
        { label: "Time (local)", value: asText(testingWindow.time, "Workspace default") },
        { label: "Timezone", value: asText(testingWindow.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone) },
      ],
    },
    {
      title: "Excluded assets",
      rows:
        excludedTargets.length > 0
          ? excludedTargets.slice(0, 4).map((target) => ({ label: target, value: "" }))
          : [{ label: "None configured", value: "" }],
    },
    {
      title: "Provider profile",
      rows: [
        { label: "Provider", value: provider?.name ?? "Not selected", tone: provider ? "default" : "warning" },
        { label: "Type", value: provider ? humanizeStatus(provider.provider_type) : "Choose a profile" },
        { label: "Credential", value: provider?.has_credential ? "Present" : "Missing or not selected", tone: provider?.has_credential ? "default" : "warning" },
      ],
    },
    {
      title: "Policy summary",
      rows: [
        { label: "Policy", value: policy?.name ?? "Not selected", tone: policy ? "default" : "warning" },
        { label: "Risk tolerance", value: policyValue(policy, "risk_tolerance", "Backend default"), tone: "warning" },
        { label: "Approval required", value: policyValue(policy, "require_approval", policyValue(policy, "approvals", "Policy default")) },
      ],
    },
  ];
}

function readiness(details: ProjectDetailsValues, targets: Target[], hasProvider: boolean, hasPolicy: boolean): ReadinessItem[] {
  const hasName = details.name.trim().length > 0;
  const hasTarget = targets.some((target) => target.status === "In scope" && target.value.trim().length > 0);
  const hasScopeRules = hasTarget;

  return [
    { label: "Project details", status: hasName ? "complete" : "in-progress" },
    { label: "Targets", status: hasTarget ? "complete" : "in-progress" },
    { label: "Scope rules", status: hasScopeRules ? "complete" : "not-started" },
    { label: "Provider profile", status: hasProvider ? "complete" : "not-started" },
    { label: "Policy", status: hasPolicy ? "complete" : "not-started" },
    { label: "Review", status: hasName && hasTarget && hasProvider && hasPolicy ? "in-progress" : "not-started" },
  ];
}

function setupSteps(details: ProjectDetailsValues, targets: Target[], hasProvider: boolean, hasPolicy: boolean): SetupStep[] {
  const items = readiness(details, targets, hasProvider, hasPolicy);

  return [
    { number: 1, title: "Project details", state: items[0].status === "complete" ? "completed" : "active", detail: items[0].status === "complete" ? "Completed" : "In progress" },
    { number: 2, title: "Targets", state: items[1].status === "complete" ? "completed" : items[0].status === "complete" ? "active" : "pending", detail: items[1].status === "complete" ? "Completed" : items[0].status === "complete" ? "In progress" : "Pending" },
    { number: 3, title: "Scope rules", state: items[2].status === "complete" ? "completed" : items[1].status === "complete" ? "active" : "pending", detail: items[2].status === "complete" ? "Ready" : items[1].status === "complete" ? "In progress" : "Pending" },
    { number: 4, title: "Provider profile", state: hasProvider ? "completed" : items[2].status === "complete" ? "active" : "pending", detail: hasProvider ? "Selected" : items[2].status === "complete" ? "Choose profile" : "Pending" },
    { number: 5, title: "Policy", state: hasPolicy ? "completed" : hasProvider ? "active" : "pending", detail: hasPolicy ? "Selected" : hasProvider ? "Choose policy" : "Pending" },
    { number: 6, title: "Review", state: hasProvider && hasPolicy && items[2].status === "complete" ? "active" : "pending", detail: hasProvider && hasPolicy && items[2].status === "complete" ? "Ready" : "Pending" },
  ];
}

function checklist(details: ProjectDetailsValues, targets: Target[], hasProvider: boolean, hasPolicy: boolean): ChecklistItem[] {
  const hasName = details.name.trim().length > 0;
  const hasInScopeTarget = targets.some((target) => target.status === "In scope" && target.value.trim().length > 0);

  return [
    { label: "Project name is set", status: hasName ? "complete" : "error" },
    { label: "At least one in-scope target", status: hasInScopeTarget ? "complete" : "error" },
    { label: "Scope rules can be generated", status: hasInScopeTarget ? "complete" : "waiting" },
    { label: "Provider profile selected", status: hasProvider ? "complete" : "waiting" },
    { label: "Policy selected", status: hasPolicy ? "complete" : "waiting" },
  ];
}

export function useNewAssessmentSetup({
  details,
  targets,
  selectedPolicyId,
  selectedProviderId,
}: UseNewAssessmentSetupInput) {
  const currentUser = useCurrentUser();
  const workspace = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const projects = useQuery({ queryKey: queryKeys.projects.list(), queryFn: listProjects });
  const sessions = useQuery({ queryKey: queryKeys.sessions.list(), queryFn: listSessions });
  const providers = useQuery({ queryKey: queryKeys.providerProfiles.list(), queryFn: listProviderProfiles });
  const policies = useQuery({ queryKey: queryKeys.policies.list(), queryFn: listPolicies });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });

  const projectItems = pageItems(projects.data);
  const sessionItems = pageItems(sessions.data);
  const providerItems = pageItems(providers.data);
  const policyItems = pageItems(policies.data);
  const roleItems = pageItems(roles.data);
  const userItems = pageItems(users.data);

  const targetQueries = useQueries({
    queries: projectItems.slice(0, 4).map((project) => ({
      queryKey: queryKeys.projects.targets(project.id),
      queryFn: () => listTargets(project.id),
      enabled: Boolean(project.id),
    })),
  });

  const targetCounts = new Map<string, number>();
  projectItems.slice(0, 4).forEach((project, index) => {
    targetCounts.set(project.id, pageItems(targetQueries[index]?.data).length);
  });

  const selectedProvider = providerItems.find((provider) => provider.id === selectedProviderId);
  const selectedPolicy = policyItems.find((policy) => policy.id === selectedPolicyId);
  const hasProvider = Boolean(selectedProvider);
  const hasPolicy = Boolean(selectedPolicy);
  const userName = displayNameFromEmail(currentUser.data?.email);

  return {
    checklistItems: checklist(details, targets, hasProvider, hasPolicy),
    defaultPolicyId: activeFirst(policyItems)?.id ?? null,
    defaultProviderId: activeFirst(providerItems)?.id ?? null,
    error: currentUser.error ?? workspace.error ?? projects.error ?? sessions.error ?? providers.error ?? policies.error ?? roles.error ?? users.error ?? null,
    guardrailSections: buildGuardrails({
      policy: selectedPolicy,
      provider: selectedProvider,
      targets,
      workspaceSettings: workspace.data?.settings ?? {},
    }),
    isLoading:
      currentUser.isLoading ||
      workspace.isLoading ||
      projects.isLoading ||
      sessions.isLoading ||
      providers.isLoading ||
      policies.isLoading ||
      roles.isLoading ||
      users.isLoading ||
      targetQueries.some((query) => query.isLoading),
    policyOptions: mapPolicyOptions(policyItems),
    providerOptions: mapProviderOptions(providerItems),
    readinessItems: readiness(details, targets, hasProvider, hasPolicy),
    recentDrafts: mapRecentDrafts({ projects: projectItems, sessions: sessionItems, targetCounts }),
    rolePermissions: roleSummaries(roleItems, userItems, currentUser.data?.role),
    setupSteps: setupSteps(details, targets, hasProvider, hasPolicy),
    userInitials: initials(currentUser.data?.email),
    userName,
    workspaceName: workspace.data?.name ?? "ScopeForge Workspace",
  };
}
