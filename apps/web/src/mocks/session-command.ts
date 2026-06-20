import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Database,
  FileText,
  Folder,
  Home,
  MessageSquare,
  Shield,
  ShieldCheck,
  SquareTerminal,
  Target,
  Timer,
} from "lucide-react";

import type {
  ApprovalItem,
  LiveEvent,
  MemoryItem,
  MetricItem,
  SessionNavItem,
  SessionTask,
  TimelineEvent,
} from "@/types/session-command";

export const sessionNavItems: SessionNavItem[] = [
  { label: "Workspace", icon: Home },
  { label: "Projects", icon: Folder },
  { label: "Sessions", icon: Activity, active: true },
  { label: "Runtime", icon: SquareTerminal },
  { label: "Approvals", icon: ShieldCheck, badge: 2 },
  { label: "Evidence", icon: FileText, badge: 7 },
  { label: "Findings", icon: Target, badge: 3 },
  { label: "Reports", icon: FileText },
  { label: "Memory", icon: Database },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Shield },
];

export const sessionTasks: SessionTask[] = [
  {
    id: "scope",
    index: "1.",
    title: "Validate scope and objective",
    completeCount: 2,
    totalCount: 2,
    status: "completed",
    steps: [
      {
        id: "scope-boundaries",
        index: "1.1",
        title: "Confirm scope boundaries",
        status: "completed",
      },
      {
        id: "out-of-scope",
        index: "1.2",
        title: "Validate out-of-scope items",
        status: "completed",
      },
    ],
  },
  {
    id: "approach",
    index: "2.",
    title: "Prepare testing approach",
    completeCount: 1,
    totalCount: 2,
    status: "in_progress",
    steps: [
      {
        id: "attack-surface",
        index: "2.1",
        title: "Map attack surface",
        status: "running",
        duration: "12m 34s",
      },
      {
        id: "strategy",
        index: "2.2",
        title: "Define test strategy",
        status: "pending",
      },
    ],
  },
  {
    id: "readiness",
    index: "3.",
    title: "Execution readiness",
    completeCount: 0,
    totalCount: 2,
    status: "pending",
    steps: [
      {
        id: "environment",
        index: "3.1",
        title: "Environment verification",
        status: "pending",
      },
      {
        id: "tooling",
        index: "3.2",
        title: "Tooling validation",
        status: "pending",
      },
    ],
  },
];

export const recentEvents: TimelineEvent[] = [
  {
    time: "10:14:02",
    event: "tool_call.started",
    actor: "Agent",
    detail: "terminal.execute [curl -I https://staging...]",
    tone: "blue",
  },
  {
    time: "10:14:08",
    event: "tool_call.output",
    actor: "System",
    detail: "HTTP/2 200 OK",
    tone: "teal",
  },
  {
    time: "10:14:11",
    event: "tool_call.finished",
    actor: "System",
    detail: "Succeeded • 812 ms",
    tone: "green",
  },
  {
    time: "10:14:13",
    event: "evidence.created",
    actor: "System",
    detail: "Terminal output saved",
    tone: "teal",
  },
  {
    time: "10:14:18",
    event: "agent.message",
    actor: "Agent",
    detail: "Identified health endpoint",
    tone: "teal",
  },
];

export const liveEvents: LiveEvent[] = [
  {
    time: "10:15:12",
    event: "tool_call.started",
    actor: "Agent",
    detail: "terminal.execute (curl https://staging.acme.com/)",
  },
  {
    time: "10:15:13",
    event: "job.queued",
    actor: "System",
    detail: "tools.execute (job_7f2a1c3d)",
  },
  {
    time: "10:15:13",
    event: "job.started",
    actor: "Worker 2",
    detail: "tools.execute (job_7f2a1c3d)",
  },
  {
    time: "10:15:15",
    event: "tool_call.output",
    actor: "System",
    detail: "<!doctype html> ...",
  },
  {
    time: "10:15:16",
    event: "tool_call.finished",
    actor: "System",
    detail: "Succeeded • 1.32 s",
  },
];

export const approvalItems: ApprovalItem[] = [
  {
    title: "terminal.execute",
    detail: "curl -I https://api.staging.acme.com/health",
    meta: "Requested 1m ago • Step 2.1",
  },
  {
    title: "file.write",
    detail: "/workspace/output/attack-surface.json",
    meta: "Requested 3m ago • Step 2.1",
  },
];

export const memoryItems: MemoryItem[] = [
  {
    title: "Known staging endpoints",
    meta: "Project • Updated 2d ago",
  },
  {
    title: "Acme auth flow notes",
    meta: "Project • Updated 1d ago",
  },
  {
    title: "Rate limit behavior",
    meta: "Workspace • Updated 3d ago",
  },
];

export const metricItems: MetricItem[] = [
  {
    label: "Tool calls",
    value: "12",
    helper: "80% success",
    tone: "teal",
    icon: SquareTerminal,
    sparkline: [16, 10, 14, 9, 13, 18, 15, 20, 12],
  },
  {
    label: "Evidence",
    value: "7",
    helper: "2.1 MB",
    tone: "teal",
    icon: FileText,
    sparkline: [8, 14, 10, 17, 13, 19, 12, 16, 10],
  },
  {
    label: "Findings",
    value: "3",
    helper: "1 high, 2 medium",
    tone: "red",
    icon: Target,
    sparkline: [12, 16, 10, 15, 18, 11, 14, 9, 13],
  },
  {
    label: "Approvals",
    value: "2",
    helper: "0 approved, 2 pending",
    tone: "amber",
    icon: ShieldCheck,
    sparkline: [8, 10, 14, 9, 15, 18, 13, 9, 11],
  },
  {
    label: "Jobs",
    value: "8",
    helper: "1 failed",
    tone: "teal",
    icon: BriefcaseBusiness,
    sparkline: [10, 15, 12, 18, 14, 19, 16, 20, 13],
  },
  {
    label: "Agent messages",
    value: "24",
    helper: "18 assistant, 6 system",
    tone: "teal",
    icon: MessageSquare,
    sparkline: [9, 12, 16, 11, 15, 20, 18, 13, 17],
  },
];

export const sessionFacts = [
  { label: "Mode", value: "Assisted", icon: Activity },
  { label: "Elapsed", value: "01:24:37", icon: Timer },
  { label: "Provider", value: "OpenAI Default", icon: Database },
  { label: "Policy", value: "Standard Web Review", icon: ShieldCheck },
];
