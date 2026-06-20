import type { LucideIcon } from "lucide-react";

export type SessionsListNavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
};

export type SessionListStatus =
  | "draft"
  | "planning"
  | "running"
  | "awaiting_approval"
  | "paused"
  | "completed"
  | "failed"
  | "stopped"
  | "archived";

export type SessionRuntimeState = "healthy" | "idle" | "stopped" | "failed";

export type SessionOwner = {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: "teal" | "blue" | "purple" | "amber";
};

export type SessionLatestEvent = {
  time: string;
  label: string;
  detail: string;
  tone: "teal" | "amber" | "slate";
};

export type SessionsListSession = {
  id: string;
  title: string;
  project: string;
  scope: string;
  status: SessionListStatus;
  currentStep: string;
  taskProgress: string;
  runtime: {
    state: SessionRuntimeState;
    label: string;
  };
  approvals: number;
  evidence: number;
  findings: number;
  lastEventTime: string;
  lastEventDate: string;
  owner: SessionOwner;
  createdAt: string;
  updatedAt: string;
  objective: string;
  providerProfile: string;
  policy: string;
  progress: {
    currentTask: string;
    taskProgressLabel: string;
    taskProgressPercent: number;
    stepProgressLabel: string;
    stepProgressPercent: number;
  };
  latestEvents: SessionLatestEvent[];
};

export type SessionStatusTabKey = SessionListStatus | "all";

export type SessionStatusTab = {
  key: SessionStatusTabKey;
  label: string;
  count: number;
};

export type SessionOverviewStatus = {
  status: SessionListStatus;
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
};

export type SessionsOverviewMetric = {
  label: string;
  value: string;
  helper: string;
  trend?: number[];
  tone?: "teal" | "red" | "slate";
};
