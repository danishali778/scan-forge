import type { LucideIcon } from "lucide-react";

export interface ProviderNavItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  danger?: boolean;
}

export interface ProviderProfileRow {
  id: string;
  name: string;
  type: string;
  models: string[];
  credential: "present" | "missing";
  budget: string;
  usagePercent: number;
  status: "enabled" | "disabled";
  updatedAt: string;
  default?: boolean;
}

export interface PolicyProfileRow {
  id: string;
  name: string;
  mode: string;
  terminal: string;
  fileWrites: string;
  memory: string;
  approvalRequired: string;
  updatedAt: string;
  default?: boolean;
  hasIssue?: boolean;
}

export interface ProviderHealthMetric {
  label: string;
  rows: Array<{
    label: string;
    value: string;
    helper?: string;
    tone: "teal" | "amber" | "red";
  }>;
}

export interface ProviderAuditEvent {
  time: string;
  action: string;
  actor: string;
}
