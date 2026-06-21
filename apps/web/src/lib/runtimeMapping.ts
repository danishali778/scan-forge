import { formatEventTime, humanizeStatus } from "@/lib/formatters";
import type {
  ApiRuntimeInstance,
  ApiSessionDetail,
  ApiSessionEvent,
  ApiToolCall,
  RuntimeFileEntry,
  RuntimeFileListResponse,
} from "@/types/api";
import type {
  AuditEvent,
  FileNode,
  PolicyDecision,
  RecentFileWrite,
  RiskLevel,
  RuntimeHealth,
  RuntimeInstance,
  RuntimeMode,
  RuntimeStatus,
  ToolCall,
  ToolCallFilter,
  ToolCallStatus,
} from "@/types/runtime-tool-calls";

const TOOL_STATUS_ORDER: ToolCallStatus[] = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "timed_out",
  "cancelled",
  "denied",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationMs(value: number | null | undefined): string {
  if (!value || value < 0) {
    return "--";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function formatBytes(value: number | null | undefined): string {
  if (!value || value < 0) {
    return "--";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function elapsedSince(value: string | null | undefined): string {
  if (!value) {
    return "Not started";
  }

  const start = new Date(value).getTime();

  if (Number.isNaN(start)) {
    return "Unknown";
  }

  const totalSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function normalizeRuntimeStatus(status: string): RuntimeStatus {
  if (["starting", "running", "stopping", "stopped", "failed", "unhealthy"].includes(status)) {
    return status as RuntimeStatus;
  }

  return "stopped";
}

function runtimeHealth(status: RuntimeStatus): RuntimeHealth {
  if (status === "running") {
    return "healthy";
  }

  if (status === "failed" || status === "unhealthy") {
    return "unhealthy";
  }

  return "degraded";
}

function normalizeToolStatus(status: string): ToolCallStatus {
  if (TOOL_STATUS_ORDER.includes(status as ToolCallStatus)) {
    return status as ToolCallStatus;
  }

  return "failed";
}

function normalizePolicyDecision(value: unknown): PolicyDecision {
  const decision = String(value || "allow");

  if (decision === "require_approval") {
    return "require_approval";
  }

  if (decision === "deny" || decision === "denied") {
    return "denied";
  }

  return "allow";
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  const risk = String(value || "low");

  if (risk === "medium" || risk === "high") {
    return risk;
  }

  return "low";
}

function commandFromArguments(argumentsValue: Record<string, unknown>): string[] {
  const command = argumentsValue.command;

  if (Array.isArray(command)) {
    return command.map((item) => String(item));
  }

  return [];
}

function resultOutput(toolCall: ApiToolCall): string[] {
  if (toolCall.raw_output) {
    return toolCall.raw_output.split(/\r?\n/).filter(Boolean);
  }

  const result = asRecord(toolCall.result);

  if (Object.keys(result).length > 0) {
    return JSON.stringify(result, null, 2).split(/\r?\n/);
  }

  return [];
}

function auditTrail(toolCall: ApiToolCall): AuditEvent[] {
  const events: AuditEvent[] = [];

  if (toolCall.started_at) {
    events.push({
      time: formatEventTime(toolCall.started_at),
      event: "Tool call started",
      actor: "system",
    });
  }

  if (toolCall.completed_at) {
    events.push({
      time: formatEventTime(toolCall.completed_at),
      event: `Tool call ${humanizeStatus(toolCall.status).toLowerCase()}`,
      actor: "system",
    });
  }

  if (events.length === 0) {
    events.push({
      time: "--",
      event: `Tool call ${humanizeStatus(toolCall.status).toLowerCase()}`,
      actor: "system",
    });
  }

  return events;
}

function fileNode(entry: RuntimeFileEntry): FileNode {
  const isFolder = entry.type === "directory" || entry.type === "folder";

  return {
    id: entry.path,
    name: entry.name,
    path: entry.path,
    kind: isFolder ? "folder" : "file",
    expanded: false,
  };
}

export function mapRuntimeInstance(runtime: ApiRuntimeInstance): RuntimeInstance {
  const status = normalizeRuntimeStatus(runtime.status);
  const resourceLimits = asRecord(runtime.resource_limits);
  const networkMode = asString(resourceLimits.network_mode, "none");
  const timeoutSeconds = asNumber(resourceLimits.timeout_seconds);
  const maxOutputBytes = asNumber(resourceLimits.max_output_bytes);

  return {
    id: runtime.id,
    externalId: runtime.external_id ?? "Not assigned",
    image: runtime.image,
    networkMode,
    workspacePath: runtime.workspace_path,
    limits: [
      { label: "Timeout", value: timeoutSeconds ? `${timeoutSeconds}s` : "Default" },
      { label: "Output", value: maxOutputBytes ? formatBytes(maxOutputBytes) : "Default" },
      { label: "Type", value: humanizeStatus(runtime.runtime_type) },
    ],
    startedAt: formatDateTime(runtime.started_at),
    uptime: elapsedSince(runtime.started_at),
    healthChecks: [
      {
        label: "Runtime state",
        status: status === "running" ? "ok" : status === "failed" || status === "unhealthy" ? "failed" : "warning",
        checkedAgo: "live",
      },
      {
        label: "Workspace mounted",
        status: runtime.workspace_path ? "ok" : "warning",
        checkedAgo: "live",
      },
      {
        label: "Network policy",
        status: networkMode === "none" ? "ok" : "warning",
        checkedAgo: "live",
      },
    ],
    mounts: [
      { label: "input", path: "/workspace/input" },
      { label: "output", path: "/workspace/output" },
      { label: "scripts", path: "/workspace/scripts" },
      { label: "artifacts", path: "/workspace/artifacts" },
      { label: "tmp", path: "/workspace/tmp" },
    ],
  };
}

export function emptyRuntimeInstance(sessionId: string): RuntimeInstance {
  return {
    id: sessionId ? `session:${sessionId.slice(0, 8)}` : "No runtime",
    externalId: "Not started",
    image: "scopeforge-runtime-python:local",
    networkMode: "none",
    workspacePath: "/workspace",
    limits: [
      { label: "Timeout", value: "Default" },
      { label: "Output", value: "Default" },
      { label: "Type", value: "Container" },
    ],
    startedAt: "Not started",
    uptime: "--",
    healthChecks: [
      { label: "Runtime state", status: "warning", checkedAgo: "not started" },
      { label: "Workspace mounted", status: "warning", checkedAgo: "not started" },
      { label: "Network policy", status: "ok", checkedAgo: "configured" },
    ],
    mounts: [
      { label: "input", path: "/workspace/input" },
      { label: "output", path: "/workspace/output" },
      { label: "scripts", path: "/workspace/scripts" },
      { label: "artifacts", path: "/workspace/artifacts" },
      { label: "tmp", path: "/workspace/tmp" },
    ],
  };
}

export function mapRuntimeHeaderData(session: ApiSessionDetail | undefined, runtime: ApiRuntimeInstance | null) {
  const status = runtime ? normalizeRuntimeStatus(runtime.status) : "stopped";

  return {
    breadcrumb: ["Sessions", session?.title ?? "Selected session", "Runtime"],
    status,
    health: runtimeHealth(status),
    mode: (session?.mode === "autonomous" ? "autonomous" : "assisted") as RuntimeMode,
  };
}

export function mapToolCall(toolCall: ApiToolCall): ToolCall {
  const argumentsValue = asRecord(toolCall.arguments);
  const policyDecision = asRecord(toolCall.policy_decision);
  const command = commandFromArguments(argumentsValue);
  const stdout = resultOutput(toolCall);
  const stderr = toolCall.error_message ? [toolCall.error_message] : [];
  const decision = normalizePolicyDecision(policyDecision.decision);
  const constraints = asRecord(policyDecision.constraints);

  return {
    id: toolCall.id,
    tool: toolCall.tool_name === "terminal" ? "terminal.execute" : toolCall.tool_name,
    status: normalizeToolStatus(toolCall.status),
    command: command.length > 0 ? command.join(" ") : asString(argumentsValue.path, toolCall.tool_name),
    step: toolCall.step_id ? toolCall.step_id.slice(0, 8) : "--",
    duration: formatDurationMs(toolCall.duration_ms),
    policy: decision,
    output: toolCall.raw_output ? formatBytes(new Blob([toolCall.raw_output]).size) : toolCall.error_message ? "Error" : "--",
    created: formatEventTime(toolCall.started_at ?? toolCall.completed_at ?? ""),
    commandDetail: {
      argv: command,
      cwd: asString(argumentsValue.cwd, "/workspace"),
      timeout: `${asNumber(argumentsValue.timeout_seconds) ?? "--"}s`,
      maxOutputBytes: String(asNumber(argumentsValue.max_output_bytes) ?? "--"),
      created: formatDateTime(toolCall.started_at ?? toolCall.completed_at),
    },
    policyDetail: {
      decision,
      riskLevel: normalizeRiskLevel(policyDecision.risk_level),
      reasons: asStringArray(policyDecision.reasons),
      constraints: Object.entries(constraints).map(([key, value]) => `${humanizeStatus(key)}: ${String(value)}`),
    },
    outputDetail: {
      stdout,
      stderr,
    },
    job: toolCall.runtime_command_id
      ? {
          id: toolCall.runtime_command_id,
          worker: "runtime",
        }
      : undefined,
    auditTrail: auditTrail(toolCall),
  };
}

export function buildToolCallFilters(toolCalls: ToolCall[]): ToolCallFilter[] {
  const filters: ToolCallFilter[] = [
    { id: "all", label: "All", count: toolCalls.length },
    ...TOOL_STATUS_ORDER.map((status) => ({
      id: status,
      label: humanizeStatus(status),
      count: toolCalls.filter((toolCall) => toolCall.status === status).length,
    })),
  ];

  return filters.filter((filter) => filter.id === "all" || filter.count > 0);
}

export function mapRuntimeFiles(response: RuntimeFileListResponse | null | undefined): FileNode[] {
  if (!response) {
    return [];
  }

  return [
    {
      id: response.path,
      name: response.path,
      path: response.path,
      kind: "folder",
      expanded: true,
      children: response.entries.map(fileNode),
    },
  ];
}

export function mapRecentFileWrites(events: ApiSessionEvent[], toolCalls: ToolCall[]): RecentFileWrite[] {
  const eventWrites = events
    .filter((event) => event.event_type === "file.written")
    .map((event) => {
      const payload = asRecord(event.payload);

      return {
        path: asString(payload.path, "/workspace"),
        size: formatBytes(asNumber(payload.size_bytes)),
        written: formatEventTime(event.created_at),
        toolCallId: asString(payload.tool_call_id, "--"),
        actor: event.actor_type,
      };
    });

  if (eventWrites.length > 0) {
    return eventWrites;
  }

  return toolCalls
    .filter((toolCall) => toolCall.tool.startsWith("file.write") && toolCall.status === "succeeded")
    .slice(0, 6)
    .map((toolCall) => ({
      path: toolCall.command,
      size: toolCall.output,
      written: toolCall.created,
      toolCallId: toolCall.id,
      actor: "system",
    }));
}
