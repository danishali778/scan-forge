import type { LucideIcon } from "lucide-react";

export type SessionNavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
};

export type SessionStepStatus = "completed" | "running" | "pending";

export type SessionStep = {
  id: string;
  index: string;
  title: string;
  status: SessionStepStatus;
  duration?: string;
};

export type SessionTask = {
  id: string;
  index: string;
  title: string;
  completeCount: number;
  totalCount: number;
  status: "completed" | "in_progress" | "pending";
  steps: SessionStep[];
};

export type TimelineEvent = {
  time: string;
  event: string;
  actor: string;
  detail: string;
  tone?: "blue" | "teal" | "green";
};

export type LiveEvent = {
  time: string;
  event: string;
  actor: string;
  detail: string;
};

export type ApprovalItem = {
  title: string;
  detail: string;
  meta: string;
};

export type MemoryItem = {
  title: string;
  meta: string;
};

export type MetricItem = {
  label: string;
  value: string;
  helper: string;
  tone: "teal" | "red" | "amber" | "slate";
  icon: LucideIcon;
  sparkline: number[];
};
