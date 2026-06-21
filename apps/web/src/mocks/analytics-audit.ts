import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  Database,
  Download,
  FileText,
  Folder,
  ListChecks,
  Settings,
  Shield,
  ShieldCheck,
  SquareTerminal,
  Target,
} from "lucide-react";

import type {
  AnalyticsMetric,
  AnalyticsNavItem,
  AuditEventRow,
  SessionFindingMetric,
  SeverityMetric,
  StatusSlice,
  ToolMetric,
} from "@/types/analytics-audit";

export const analyticsNavigation: AnalyticsNavItem[] = [
  { label: "Workspace", icon: BriefcaseBusiness },
  { label: "Projects", icon: Folder },
  { label: "Sessions", icon: Activity },
  { label: "Runtime", icon: SquareTerminal },
  { label: "Approvals", icon: ShieldCheck, badge: 8 },
  { label: "Evidence", icon: FileText, badge: 24 },
  { label: "Findings", icon: Target, badge: 7, danger: true },
  { label: "Reports", icon: FileText },
  { label: "Memory", icon: Database },
  { label: "Analytics", icon: BarChart3, active: true },
  { label: "Audit", icon: ListChecks },
  { label: "Settings", icon: Settings },
];

export const analyticsTabs = ["Overview", "Sessions", "Tools", "Findings", "Approvals", "Audit"] as const;

export const topActions = [
  { label: "May 20 - Jun 19, 2026", helper: "Last 30 days", icon: Calendar },
  { label: "Export", icon: Download },
  { label: "Reviewer", icon: Shield },
];

export const metrics: AnalyticsMetric[] = [
  { label: "Sessions completed", value: "23", helper: "28% vs prior 30d", tone: "teal", sparkline: [8, 12, 10, 16, 11, 20, 13, 18, 15, 19] },
  { label: "Tool success rate", value: "91.2%", helper: "6.7pp vs prior 30d", tone: "teal", sparkline: [12, 14, 13, 18, 16, 22, 15, 11, 14, 18] },
  { label: "Pending approvals", value: "8", helper: "5 high   3 medium", tone: "amber", sparkline: [8, 13, 7, 12, 9, 14, 8, 12, 10, 13] },
  { label: "Confirmed findings", value: "17", helper: "21% vs prior 30d", tone: "teal", sparkline: [7, 12, 9, 15, 11, 17, 10, 14, 12, 18] },
  { label: "Job failures", value: "3", helper: "25% vs prior 30d", tone: "red", sparkline: [5, 4, 7, 3, 9, 5, 4, 2, 3, 2] },
];

export const statusSlices: StatusSlice[] = [
  { label: "Completed", value: 11, color: "bg-emerald-600" },
  { label: "Running", value: 6, color: "bg-teal-600" },
  { label: "Planning", value: 3, color: "bg-blue-400" },
  { label: "Paused", value: 2, color: "bg-slate-400" },
  { label: "Failed", value: 1, color: "bg-red-500" },
];

export const toolMetrics: ToolMetric[] = [
  { tool: "terminal.execute", calls: "3,782", successRate: "96.4%", failureRate: "2.1%", deniedRate: "1.5%", p95: "1.42s" },
  { tool: "file.read", calls: "2,914", successRate: "98.2%", failureRate: "0.9%", deniedRate: "0.9%", p95: "820ms" },
  { tool: "http.request", calls: "2,451", successRate: "91.6%", failureRate: "6.2%", deniedRate: "2.2%", p95: "1.86s" },
  { tool: "file.write", calls: "1,604", successRate: "89.0%", failureRate: "7.4%", deniedRate: "3.6%", p95: "1.33s" },
  { tool: "memory.search", calls: "1,128", successRate: "97.3%", failureRate: "1.5%", deniedRate: "1.2%", p95: "310ms" },
  { tool: "report.generate", calls: "642", successRate: "94.4%", failureRate: "3.4%", deniedRate: "2.2%", p95: "2.54s" },
];

export const severities: SeverityMetric[] = [
  { severity: "Critical", count: 4, percent: "12%", tone: "critical" },
  { severity: "High", count: 8, percent: "24%", tone: "high" },
  { severity: "Medium", count: 11, percent: "32%", tone: "medium" },
  { severity: "Low", count: 9, percent: "26%", tone: "low" },
  { severity: "Info", count: 2, percent: "6%", tone: "info" },
];

export const sessionFindings: SessionFindingMetric[] = [
  { session: "External staging review", sessionId: "ses_8f12bd7a1", project: "API Red Team", findings: 6, severity: "High" },
  { session: "Cloud config review", sessionId: "ses_3cfd7e11", project: "Cloud Audit", findings: 4, severity: "Medium" },
  { session: "Payment flow assessment", sessionId: "ses_f4bfa2d9", project: "Web App Pentest", findings: 3, severity: "High" },
  { session: "Mobile API audit", sessionId: "ses_9d7fbc42", project: "Mobile Backend", findings: 2, severity: "Medium" },
  { session: "Internal network review", sessionId: "ses_7bd0c8e6", project: "Network Test", findings: 2, severity: "Low" },
];

export const auditEvents: AuditEventRow[] = [
  { time: "Jun 19, 2026 10:45:21 AM", actor: "Danish Ali", initials: "DA", action: "User login", resource: "ScopeForge", ipDevice: "103.27.114.56  Windows / Chrome", result: "Success", details: "MFA: Ok" },
  { time: "Jun 19, 2026 10:31:04 AM", actor: "Danish Ali", initials: "DA", action: "API token created", resource: "Personal access token", ipDevice: "103.27.114.56  Windows / Chrome", result: "Success", details: "Token: pat_---3f7a" },
  { time: "Jun 19, 2026 09:58:17 AM", actor: "System", initials: "SYS", action: "Provider profile updated", resource: "OpenAI Default", ipDevice: "-", result: "Success", details: "Model: gpt-4o -> gpt-4o latest" },
  { time: "Jun 19, 2026 09:42:11 AM", actor: "Sora Khan", initials: "SK", action: "Policy updated", resource: "Standard Web Review", ipDevice: "172.16.10.24  MacOS / Safari", result: "Success", details: "Risk tolerance: Medium" },
  { time: "Jun 19, 2026 09:15:33 AM", actor: "Aria Shah", initials: "AS", action: "Runtime started", resource: "runtime-sf3d2a1c", ipDevice: "172.16.20.11  Linux / CLI", result: "Success", details: "Session: ses_8f12bd7a1" },
  { time: "Jun 19, 2026 08:59:07 AM", actor: "Mike Turner", initials: "MT", action: "File write via tool", resource: "/workspace/scripts/check.py", ipDevice: "172.16.20.11  Linux / CLI", result: "Success", details: "tool: file.write (512 B)" },
  { time: "Jun 18, 2026 05:41:22 PM", actor: "Danish Ali", initials: "DA", action: "Report exported", resource: "external-staging-review-2026-06-18.md", ipDevice: "103.27.114.56  Windows / Chrome", result: "Success", details: "Format: Markdown (248 KB)" },
];
