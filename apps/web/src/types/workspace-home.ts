import type { LucideIcon } from "lucide-react";

export type WorkspaceTone = "teal" | "amber" | "red" | "cyan" | "blue" | "violet" | "slate";

export type WorkspaceNavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
};

export type WorkspaceMetricFact = {
  label: string;
  value: string;
  tone?: WorkspaceTone;
};

export type WorkspaceMetric = {
  label: string;
  value: string;
  tone: WorkspaceTone;
  icon: LucideIcon;
  facts: WorkspaceMetricFact[];
};

export type SessionStatus = "running" | "paused" | "planning";
export type RuntimeStatus = "healthy" | "unhealthy" | "offline";

export type WorkspaceSession = {
  id: string;
  title: string;
  project: string;
  status: SessionStatus;
  currentStep: string;
  stepProgress: string;
  runtimeStatus: RuntimeStatus;
  lastEvent: string;
  owner: string;
  ownerInitials: string;
  ownerTone: WorkspaceTone;
};

export type ActivityCategory = "Events" | "Evidence" | "Findings" | "Jobs" | "Approvals" | "Memory";

export type WorkspaceActivityItem = {
  time: string;
  label: string;
  detail: string;
  context: string;
  actor: string;
  category: ActivityCategory;
  tone: WorkspaceTone;
  icon: LucideIcon;
};

export type Severity = "high" | "medium" | "low";

export type AttentionItem = {
  id: string;
  severity: Severity;
  title: string;
  session: string;
  project: string;
  age: string;
};

export type AttentionGroup = {
  title: string;
  count: number;
  tone: WorkspaceTone;
  items: AttentionItem[];
};

export type WorkspaceSetupItem = {
  label: string;
  complete: boolean;
};

export type ApprovalRequest = {
  severity: Severity;
  state: string;
  title: string;
  requestId: string;
  sessionTitle: string;
  sessionId: string;
  project: string;
  requester: string;
  requesterRole: string;
  requestedAgo: string;
  policyName: string;
  riskLevel: string;
  reasons: string[];
  constraints: string[];
  toolDetails: Array<{
    label: string;
    value: string;
    monospace?: boolean;
  }>;
};
