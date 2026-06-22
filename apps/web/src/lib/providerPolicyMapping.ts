import { humanizeStatus } from "@/lib/formatters";
import type { ApiPolicy, ApiProviderProfile } from "@/types/api";
import type { PolicyProfileRow, ProviderHealthMetric, ProviderProfileRow } from "@/types/provider-policies";

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  return [];
}

function budgetLabel(value: Record<string, unknown>): string {
  const monthly = value.monthly_usd ?? value.monthly_budget_usd ?? value.limit_usd;

  if (typeof monthly === "number") {
    return `$${monthly.toLocaleString()} / mo`;
  }

  return "No budget";
}

function usagePercent(value: Record<string, unknown>): number {
  const usage = value.usage_percent;

  return typeof usage === "number" ? Math.max(0, Math.min(100, Math.round(usage))) : 0;
}

export function mapProviderProfile(profile: ApiProviderProfile): ProviderProfileRow {
  const models = [
    ...asStringArray(profile.agent_models.planner),
    ...asStringArray(profile.agent_models.executor),
    ...asStringArray(profile.agent_models.embedding),
  ];

  return {
    id: profile.id,
    name: profile.name,
    type: humanizeStatus(profile.provider_type),
    models: models.length > 0 ? Array.from(new Set(models)) : ["Default model"],
    credential: profile.has_credential ? "present" : "missing",
    budget: budgetLabel(profile.budgets),
    usagePercent: usagePercent(profile.budgets),
    status: profile.status === "active" ? "enabled" : "disabled",
    updatedAt: profile.base_url ?? "Backend profile",
  };
}

export function mapPolicyProfile(policy: ApiPolicy): PolicyProfileRow {
  const terminal = policy.rules.terminal ?? policy.rules.commands ?? "Policy JSON";
  const fileWrites = policy.rules.file_writes ?? policy.rules.files ?? "Policy JSON";
  const memory = policy.rules.memory ?? "Policy JSON";
  const approvalRequired = policy.rules.approvals ?? policy.rules.require_approval ?? "Policy JSON";

  return {
    id: policy.id,
    name: policy.name,
    mode: policy.status === "active" ? "Active" : "Disabled",
    terminal: String(terminal),
    fileWrites: String(fileWrites),
    memory: String(memory),
    approvalRequired: String(approvalRequired),
    updatedAt: policy.description ?? "Backend policy",
    hasIssue: policy.status !== "active",
  };
}

export function providerHealthMetrics(providers: ProviderProfileRow[], policies: PolicyProfileRow[]): ProviderHealthMetric[] {
  const credentialCount = providers.filter((provider) => provider.credential === "present").length;
  const disabledProviders = providers.filter((provider) => provider.status === "disabled").length;
  const policiesWithIssues = policies.filter((policy) => policy.hasIssue).length;
  const providerTotal = Math.max(providers.length, 1);
  const policyTotal = Math.max(policies.length, 1);

  return [
    {
      label: "Credential status",
      rows: [
        { label: "Providers with credential", value: `${credentialCount} / ${providers.length}`, helper: `${Math.round((credentialCount / providerTotal) * 100)}%`, tone: "teal" },
        { label: "Missing credential", value: `${providers.length - credentialCount} / ${providers.length}`, helper: `${Math.round(((providers.length - credentialCount) / providerTotal) * 100)}%`, tone: "amber" },
        { label: "Disabled providers", value: `${disabledProviders} / ${providers.length}`, helper: `${Math.round((disabledProviders / providerTotal) * 100)}%`, tone: "red" },
      ],
    },
    {
      label: "Policy health",
      rows: [
        { label: "Valid policies", value: `${policies.length - policiesWithIssues} / ${policies.length}`, helper: `${Math.round(((policies.length - policiesWithIssues) / policyTotal) * 100)}%`, tone: "teal" },
        { label: "Policies with issues", value: `${policiesWithIssues} / ${policies.length}`, helper: `${Math.round((policiesWithIssues / policyTotal) * 100)}%`, tone: policiesWithIssues > 0 ? "amber" : "teal" },
        { label: "Last validation", value: "Backend policy state", tone: "teal" },
      ],
    },
    {
      label: "Session defaults",
      rows: [
        { label: "Default provider", value: providers[0]?.name ?? "Not configured", tone: providers[0] ? "teal" : "amber" },
        { label: "Default policy", value: policies[0]?.name ?? "Not configured", tone: policies[0] ? "teal" : "amber" },
        { label: "Approval timeout", value: "Backend default", tone: "teal" },
        { label: "Max session runtime", value: "Backend default", tone: "teal" },
      ],
    },
  ];
}
