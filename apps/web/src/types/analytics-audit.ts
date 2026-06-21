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
