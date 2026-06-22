import type { LucideIcon } from "lucide-react";

export type ApprovalRisk = "low" | "medium" | "high";

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export type ApprovalPolicyDecision = "require_approval" | "allow" | "allow_candidate" | "denied_by_policy";

export type ApprovalActionKind = "terminal" | "file" | "memory" | "report";

export type ApprovalUserColor = "slate" | "teal" | "blue" | "violet";

export type ApprovalNavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
};

export type ApprovalRequester = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  userId: string;
  color: ApprovalUserColor;
};

export type ApprovalActionDetails = {
  actionType: string;
  command: string;
  workdir: string;
  timeout: string;
  maxOutput: string;
  env: string;
};

export type ApprovalLinkedContext = {
  sessionId: string;
  sessionName: string;
  taskId: string;
  taskName: string;
  stepId: string;
  stepName: string;
};

export type ApprovalPolicyDetails = {
  decision: string;
  riskLevel: ApprovalRisk;
  reasons: string[];
  constraints: string[];
};

export type ApprovalAuditEvent = {
  time: string;
  actor: string;
  event: string;
  detail: string;
};

export type ApprovalScopeItem = {
  label: string;
  value: string;
};

export type ApprovalRequest = {
  id: string;
  requestTitle: string;
  requestDetail: string;
  actionKind: ApprovalActionKind;
  actionType: string;
  risk: ApprovalRisk;
  policyDecision: ApprovalPolicyDecision;
  requester: ApprovalRequester;
  age: string;
  status: ApprovalStatus;
  requestedAt: string;
  sessionId: string;
  sessionName: string;
  project: string;
  action: ApprovalActionDetails;
  policy: ApprovalPolicyDetails;
  linkedContext: ApprovalLinkedContext;
  scope: ApprovalScopeItem[];
  auditTrail: ApprovalAuditEvent[];
};

export type ApprovalOutcome = {
  id: string;
  status: ApprovalStatus;
  title: string;
  sessionId: string;
  requester: string;
  age: string;
};

export type ApprovalMetric = {
  label: string;
  value: string;
  helper: string;
  trend: "up" | "down";
};

export type ApprovalRiskSummary = {
  risk: ApprovalRisk;
  label: string;
  count: number;
  percentage: number;
};

export type ApiApproval = {
  id: string;
  session_id: string;
  task_id: string | null;
  step_id: string | null;
  tool_call_id: string | null;
  status: string;
  risk_level: string;
  reason: string;
  requested_action: Record<string, unknown>;
  requested_by_agent: string;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type ApprovalResolveRequest = {
  note?: string | null;
};
