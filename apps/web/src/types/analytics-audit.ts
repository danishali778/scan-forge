import type { LucideIcon } from "lucide-react";

export interface AnalyticsNavItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  danger?: boolean;
}

export interface AnalyticsMetric {
  label: string;
  value: string;
  helper: string;
  tone: "teal" | "amber" | "red";
  sparkline: number[];
}

export interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

export interface ToolMetric {
  tool: string;
  calls: string;
  successRate: string;
  failureRate: string;
  deniedRate: string;
  p95: string;
}

export interface SeverityMetric {
  severity: string;
  count: number;
  percent: string;
  tone: "critical" | "high" | "medium" | "low" | "info";
}

export interface SessionFindingMetric {
  session: string;
  sessionId: string;
  project: string;
  findings: number;
  severity: "High" | "Medium" | "Low";
}

export interface AuditEventRow {
  time: string;
  actor: string;
  initials: string;
  action: string;
  resource: string;
  ipDevice: string;
  result: "Success" | "Denied";
  details: string;
}

export interface ApiCountItem {
  key: string;
  count: number;
}

export interface ApiToolAnalyticsItem {
  tool_name: string;
  count: number;
  succeeded: number;
  failed: number;
  average_duration_ms: number | null;
}

export interface ApiAnalyticsOverview {
  session_count: number;
  session_status_counts: ApiCountItem[];
  finding_severity_counts: ApiCountItem[];
  tool_call_count: number;
  tool_success_rate: number | null;
  approval_counts: ApiCountItem[];
  job_failure_count: number;
}

export interface ApiAnalyticsSessions {
  total: number;
  status_counts: ApiCountItem[];
  average_duration_seconds: number | null;
  completed_count: number;
  failed_count: number;
  stopped_count: number;
}

export interface ApiAnalyticsTools {
  total: number;
  status_counts: ApiCountItem[];
  by_tool: ApiToolAnalyticsItem[];
  top_failed_tools: ApiToolAnalyticsItem[];
}

export interface ApiAnalyticsFindings {
  total: number;
  by_severity: ApiCountItem[];
  by_status: ApiCountItem[];
  by_confidence: ApiCountItem[];
  by_project: Array<{ project_id: string; count: number }>;
}

export interface ApiAnalyticsApprovals {
  total: number;
  status_counts: ApiCountItem[];
  average_resolution_seconds: number | null;
  pending_count: number;
  approved_count: number;
  denied_count: number;
}

export interface ApiAuditEvent {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
