export type RuntimeStatus = "starting" | "running" | "stopping" | "stopped" | "failed" | "unhealthy";

export type RuntimeHealth = "healthy" | "degraded" | "unhealthy";

export type RuntimeMode = "assisted" | "autonomous";

export type ToolCallStatus = "queued" | "running" | "succeeded" | "failed" | "timed_out" | "cancelled" | "denied";

export type PolicyDecision = "allow" | "require_approval" | "denied";

export type RiskLevel = "low" | "medium" | "high";

export type RuntimeFact = {
  label: string;
  value: string;
};

export type RuntimeHealthCheck = {
  label: string;
  status: "ok" | "warning" | "failed";
  checkedAgo: string;
};

export type RuntimeMount = {
  label: string;
  path: string;
};

export type RuntimeInstance = {
  id: string;
  externalId: string;
  image: string;
  networkMode: string;
  workspacePath: string;
  limits: RuntimeFact[];
  startedAt: string;
  uptime: string;
  healthChecks: RuntimeHealthCheck[];
  mounts: RuntimeMount[];
};

export type ToolCallFilter = {
  id: "all" | ToolCallStatus;
  label: string;
  count: number;
};

export type CommandDetail = {
  argv: string[];
  cwd: string;
  timeout: string;
  maxOutputBytes: string;
  created: string;
};

export type PolicyDetail = {
  decision: PolicyDecision;
  riskLevel: RiskLevel;
  reasons: string[];
  constraints: string[];
};

export type OutputDetail = {
  stdout: string[];
  stderr: string[];
};

export type LinkedEvidence = {
  id: string;
  source: string;
  size: string;
};

export type RuntimeJob = {
  id: string;
  worker: string;
};

export type AuditEvent = {
  time: string;
  event: string;
  actor: string;
};

export type ToolCall = {
  id: string;
  tool: string;
  status: ToolCallStatus;
  command: string;
  step: string;
  duration: string;
  policy: PolicyDecision;
  output: string;
  created: string;
  commandDetail: CommandDetail;
  policyDetail: PolicyDetail;
  outputDetail: OutputDetail;
  evidence?: LinkedEvidence;
  job?: RuntimeJob;
  auditTrail: AuditEvent[];
};

export type FileNode = {
  id: string;
  name: string;
  path: string;
  kind: "folder" | "file";
  expanded?: boolean;
  children?: FileNode[];
};

export type RecentFileWrite = {
  path: string;
  size: string;
  written: string;
  toolCallId: string;
  actor: string;
};

export type RuntimeToolCallsData = {
  workspaceName: string;
  userName: string;
  userEmail: string;
  breadcrumb: string[];
  status: RuntimeStatus;
  health: RuntimeHealth;
  mode: RuntimeMode;
  runtime: RuntimeInstance;
  filters: ToolCallFilter[];
  toolCalls: ToolCall[];
  fileTree: FileNode[];
  recentWrites: RecentFileWrite[];
};
