import { humanizeStatus } from "@/lib/formatters";
import type {
  AnalyticsMetric,
  ApiAnalyticsApprovals,
  ApiAnalyticsFindings,
  ApiAnalyticsOverview,
  ApiAnalyticsSessions,
  ApiAnalyticsTools,
  ApiAuditEvent,
  AuditEventRow,
  SeverityMetric,
  StatusSlice,
  ToolMetric,
} from "@/types/analytics-audit";

function count(items: Array<{ key: string; count: number }>, key: string): number {
  return items.find((item) => item.key === key)?.count ?? 0;
}

function percent(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 1000) / 10}%` : "--";
}

function p95Label(value: number | null): string {
  if (typeof value !== "number") {
    return "--";
  }

  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapAnalyticsMetrics(
  overview: ApiAnalyticsOverview | undefined,
  approvals: ApiAnalyticsApprovals | undefined,
): AnalyticsMetric[] {
  return [
    {
      label: "Sessions completed",
      value: String(count(overview?.session_status_counts ?? [], "completed")),
      helper: `${overview?.session_count ?? 0} total sessions`,
      tone: "teal",
      sparkline: [4, 6, 5, 7, 9, 8, 10, 7, 11, 12],
    },
    {
      label: "Tool success rate",
      value: percent(overview?.tool_success_rate),
      helper: `${overview?.tool_call_count ?? 0} tool calls`,
      tone: "teal",
      sparkline: [8, 9, 8, 10, 12, 11, 13, 10, 12, 14],
    },
    {
      label: "Pending approvals",
      value: String(approvals?.pending_count ?? count(overview?.approval_counts ?? [], "pending")),
      helper: `${approvals?.approved_count ?? 0} approved, ${approvals?.denied_count ?? 0} denied`,
      tone: "amber",
      sparkline: [3, 4, 5, 3, 6, 4, 5, 7, 6, 5],
    },
    {
      label: "Confirmed findings",
      value: String(count(overview?.finding_severity_counts ?? [], "confirmed")),
      helper: "Reviewed finding inventory",
      tone: "teal",
      sparkline: [2, 3, 4, 3, 5, 6, 5, 6, 7, 8],
    },
    {
      label: "Job failures",
      value: String(overview?.job_failure_count ?? 0),
      helper: "Backend jobs in selected window",
      tone: (overview?.job_failure_count ?? 0) > 0 ? "red" : "teal",
      sparkline: [1, 0, 1, 2, 1, 0, 0, 1, 0, 0],
    },
  ];
}

export function mapStatusSlices(sessions: ApiAnalyticsSessions | undefined): StatusSlice[] {
  const colors = ["bg-emerald-600", "bg-teal-600", "bg-blue-400", "bg-slate-400", "bg-red-500"];

  return (sessions?.status_counts ?? []).map((item, index) => ({
    label: humanizeStatus(item.key),
    value: item.count,
    color: colors[index % colors.length],
  }));
}

export function mapToolMetrics(tools: ApiAnalyticsTools | undefined): ToolMetric[] {
  return (tools?.by_tool ?? []).map((item) => ({
    tool: item.tool_name,
    calls: item.count.toLocaleString(),
    successRate: percent(item.count > 0 ? item.succeeded / item.count : null),
    failureRate: percent(item.count > 0 ? item.failed / item.count : null),
    deniedRate: "--",
    p95: p95Label(item.average_duration_ms),
  }));
}

export function mapSeverityMetrics(findings: ApiAnalyticsFindings | undefined): SeverityMetric[] {
  const total = Math.max(findings?.total ?? 0, 1);

  return (findings?.by_severity ?? []).map((item) => {
    const label = humanizeStatus(item.key);
    const tone = label.toLowerCase() as SeverityMetric["tone"];

    return {
      severity: label,
      count: item.count,
      percent: `${Math.round((item.count / total) * 100)}%`,
      tone: ["critical", "high", "medium", "low", "info"].includes(tone) ? tone : "info",
    };
  });
}

export function mapAuditEvent(event: ApiAuditEvent): AuditEventRow {
  const actor = event.actor_type === "system" ? "System" : event.actor_id;

  return {
    time: formatDate(event.created_at),
    actor,
    initials: actor.slice(0, 3).toUpperCase(),
    action: humanizeStatus(event.action),
    resource: `${event.resource_type}:${event.resource_id}`,
    ipDevice: "-",
    result: "Success",
    details: Object.keys(event.metadata).length > 0 ? JSON.stringify(event.metadata) : "-",
  };
}
