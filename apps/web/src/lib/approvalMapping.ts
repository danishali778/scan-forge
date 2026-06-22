import { formatEventTime, humanizeStatus } from "@/lib/formatters";
import { approvalRequesters } from "@/mocks/approval-queue";
import type {
  ApiApproval,
  ApprovalActionKind,
  ApprovalPolicyDecision,
  ApprovalRequest,
  ApprovalRisk,
  ApprovalStatus,
} from "@/types/approval-queue";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeStatus(status: string): ApprovalStatus {
  if (status === "approved" || status === "denied" || status === "expired") {
    return status;
  }

  return "pending";
}

function normalizeRisk(risk: string): ApprovalRisk {
  if (risk === "high" || risk === "medium") {
    return risk;
  }

  return "low";
}

function actionKind(actionType: string): ApprovalActionKind {
  if (actionType.startsWith("file")) {
    return "file";
  }

  if (actionType.startsWith("memory")) {
    return "memory";
  }

  if (actionType.startsWith("report")) {
    return "report";
  }

  return "terminal";
}

function policyDecision(status: ApprovalStatus): ApprovalPolicyDecision {
  if (status === "approved") {
    return "allow";
  }

  if (status === "denied") {
    return "denied_by_policy";
  }

  return "require_approval";
}

function commandText(action: Record<string, unknown>): string {
  const argumentsValue = asRecord(action.arguments);
  const command = argumentsValue.command;

  if (Array.isArray(command)) {
    return command.map((item) => String(item)).join(" ");
  }

  return asString(action.command, asString(action.tool_name, "approval action"));
}

function ageLabel(createdAt: string): string {
  const created = new Date(createdAt).getTime();

  if (Number.isNaN(created)) {
    return "recent";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60_000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function mapApproval(approval: ApiApproval): ApprovalRequest {
  const status = normalizeStatus(approval.status);
  const risk = normalizeRisk(approval.risk_level);
  const action = asRecord(approval.requested_action);
  const argumentsValue = asRecord(action.arguments);
  const actionType = asString(action.tool_name, asString(action.action_type, "terminal.execute"));
  const requester = approvalRequesters[0];
  const title = humanizeStatus(actionType.replace(".", " "));
  const command = commandText(action);

  return {
    id: approval.id,
    requestTitle: title,
    requestDetail: approval.reason,
    actionKind: actionKind(actionType),
    actionType,
    risk,
    policyDecision: policyDecision(status),
    requester: {
      ...requester,
      name: approval.requested_by_agent || requester.name,
      initials: (approval.requested_by_agent || requester.name).slice(0, 2).toUpperCase(),
      email: `${approval.requested_by_agent || "agent"}@scopeforge.local`,
      userId: approval.requested_by_agent || requester.userId,
    },
    age: ageLabel(approval.created_at),
    status,
    requestedAt: status === "pending" ? `Requested ${ageLabel(approval.created_at)}` : `Resolved ${formatEventTime(approval.resolved_at ?? approval.created_at)}`,
    sessionId: approval.session_id,
    sessionName: `Session ${approval.session_id.slice(0, 8)}`,
    project: `Session ${approval.session_id.slice(0, 8)}`,
    action: {
      actionType,
      command,
      workdir: asString(argumentsValue.cwd, "/workspace"),
      timeout: `${String(argumentsValue.timeout_seconds ?? "--")}s`,
      maxOutput: String(argumentsValue.max_output_bytes ?? "--"),
      env: "None",
    },
    policy: {
      decision: status === "pending" ? "Require approval" : humanizeStatus(status),
      riskLevel: risk,
      reasons: [approval.reason],
      constraints: ["Workspace scoped", "CSRF protected", "Audit event recorded"],
    },
    linkedContext: {
      sessionId: approval.session_id,
      sessionName: `Session ${approval.session_id.slice(0, 8)}`,
      taskId: approval.task_id?.slice(0, 8) ?? "--",
      taskName: "Linked task",
      stepId: approval.step_id?.slice(0, 8) ?? "--",
      stepName: "Linked step",
    },
    scope: [
      { label: "Session", value: approval.session_id },
      { label: "Tool call", value: approval.tool_call_id ?? "--" },
      { label: "Status", value: humanizeStatus(status) },
      { label: "Risk", value: humanizeStatus(risk) },
    ],
    auditTrail: [
      {
        time: formatEventTime(approval.created_at),
        actor: approval.requested_by_agent || "agent",
        event: "Approval requested",
        detail: approval.reason,
      },
      ...(approval.resolved_at
        ? [
            {
              time: formatEventTime(approval.resolved_at),
              actor: approval.resolved_by ?? "reviewer",
              event: `Approval ${status}`,
              detail: approval.resolution_note ?? "No resolution note provided.",
            },
          ]
        : []),
    ],
  };
}
