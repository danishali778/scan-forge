import {
  Bell,
  Box,
  BriefcaseBusiness,
  Database,
  FileText,
  Folder,
  KeyRound,
  ListChecks,
  Settings,
  ShieldCheck,
  SquareTerminal,
  Users,
} from "lucide-react";

import type {
  PolicyProfileRow,
  ProviderAuditEvent,
  ProviderHealthMetric,
  ProviderNavItem,
  ProviderProfileRow,
} from "@/types/provider-policies";

export const providerNavigation: ProviderNavItem[] = [
  { label: "Workspace", icon: BriefcaseBusiness },
  { label: "Projects", icon: Folder },
  { label: "Sessions", icon: Box },
  { label: "Runtime", icon: SquareTerminal },
  { label: "Approvals", icon: ShieldCheck, badge: 3 },
  { label: "Evidence", icon: FileText },
  { label: "Findings", icon: ShieldCheck, badge: 7, danger: true },
  { label: "Reports", icon: FileText },
  { label: "Memory", icon: Database },
  { label: "Analytics", icon: ListChecks },
  { label: "Audit", icon: Bell },
  { label: "Settings", icon: Settings, active: true },
];

export const settingsTabs = [
  "Workspace",
  "Users",
  "Roles",
  "Provider profiles",
  "Policies",
  "API tokens",
  "Security",
] as const;

export const providerProfiles: ProviderProfileRow[] = [
  {
    id: "prov_d1e4a9c3",
    name: "OpenAI Default",
    type: "OpenAI Compatible",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    credential: "present",
    budget: "$5,000 / mo",
    usagePercent: 80,
    status: "enabled",
    updatedAt: "Jun 19, 2026 10:41 AM",
    default: true,
  },
  {
    id: "prov_9b12f0aa",
    name: "Local Compatible",
    type: "OpenAI Compatible",
    models: ["llama-3.1-70b", "mistral-large", "mixtral-8x22b"],
    credential: "present",
    budget: "$1,000 / mo",
    usagePercent: 32,
    status: "enabled",
    updatedAt: "Jun 18, 2026 04:22 PM",
  },
  {
    id: "prov_f9372b1e",
    name: "Fake Test Provider",
    type: "Fake Provider",
    models: ["-"],
    credential: "missing",
    budget: "$100 / mo",
    usagePercent: 0,
    status: "disabled",
    updatedAt: "Jun 17, 2026 11:07 AM",
  },
];

export const policyProfiles: PolicyProfileRow[] = [
  {
    id: "pol_31a8c7d2",
    name: "Assisted safe",
    mode: "Assisted",
    terminal: "Restricted\nSafe commands only",
    fileWrites: "Restricted\nWorkspace only",
    memory: "Write\nAfter approval",
    approvalRequired: "High risk +\nDestructive",
    updatedAt: "Jun 19, 2026 09:58 AM",
    default: true,
  },
  {
    id: "pol_6f2d1b91",
    name: "Review strict",
    mode: "Review",
    terminal: "Deny list\nMost commands",
    fileWrites: "Deny by default\nAllow list only",
    memory: "Read only\nNo writes",
    approvalRequired: "All writes +\nAll terminal",
    updatedAt: "Jun 18, 2026 03:35 PM",
  },
  {
    id: "pol_0c9e2a44",
    name: "Internal demo",
    mode: "Assisted",
    terminal: "Allow list\nBasic utilities",
    fileWrites: "Allowed\nWorkspace only",
    memory: "Write\nLow risk only",
    approvalRequired: "Medium risk +\nWrites",
    updatedAt: "Jun 17, 2026 10:12 AM",
    hasIssue: true,
  },
];

export const healthMetrics: ProviderHealthMetric[] = [
  {
    label: "Credential status",
    rows: [
      { label: "Providers with credential", value: "2 / 3", helper: "66%", tone: "teal" },
      { label: "Missing credential", value: "1 / 3", helper: "33%", tone: "amber" },
      { label: "Disabled providers", value: "1 / 3", helper: "33%", tone: "red" },
    ],
  },
  {
    label: "Policy health",
    rows: [
      { label: "Valid policies", value: "2 / 3", helper: "66%", tone: "teal" },
      { label: "Policies with issues", value: "1 / 3", helper: "33%", tone: "amber" },
      { label: "Last validation", value: "Jun 19, 2026 10:45 AM", tone: "teal" },
    ],
  },
  {
    label: "Session defaults",
    rows: [
      { label: "Default provider", value: "OpenAI Default", tone: "teal" },
      { label: "Default policy", value: "Assisted safe", tone: "teal" },
      { label: "Approval timeout", value: "5 minutes", tone: "teal" },
      { label: "Max session runtime", value: "4 hours", tone: "teal" },
    ],
  },
];

export const auditEvents: ProviderAuditEvent[] = [
  { time: "Jun 19, 2026 10:41 AM", action: "Provider credentials verified", actor: "Danish Ali" },
  { time: "Jun 19, 2026 10:20 AM", action: "Connection test succeeded", actor: "System" },
  { time: "Jun 10, 2026 09:12 AM", action: "API key rotated", actor: "Danish Ali" },
];

export const selectedProvider = providerProfiles[0];
export const selectedPolicy = policyProfiles[0];
export const sideUtilities = { users: Users, key: KeyRound };
