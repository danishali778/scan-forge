import { formatEventTime, humanizeStatus } from "@/lib/formatters";
import type {
  ApiEvidence,
  ApiFinding,
  CandidateFinding,
  Confidence,
  EvidenceItem,
  EvidenceStatus,
  EvidenceType,
  FindingStatus,
  Severity,
} from "@/types/evidence-review";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  return [];
}

function evidenceType(value: string): EvidenceType {
  if (value === "terminal" || value === "file" || value === "note") {
    return value;
  }

  return "database";
}

function evidenceStatus(evidence: ApiEvidence, findings: ApiFinding[]): EvidenceStatus {
  const linkedFinding = findings.find((finding) => finding.evidence_ids.includes(evidence.id));

  if (linkedFinding?.status === "confirmed") {
    return "confirmed";
  }

  if (linkedFinding) {
    return "candidate";
  }

  return "reviewed";
}

function severity(value: string): Severity {
  const normalized = humanizeStatus(value).replace("Informational", "Low");

  if (normalized === "Critical" || normalized === "High" || normalized === "Medium") {
    return normalized;
  }

  return "Low";
}

function confidence(value: string): Confidence {
  const normalized = humanizeStatus(value);

  if (normalized === "High" || normalized === "Medium") {
    return normalized;
  }

  return "Low";
}

function findingStatus(value: string): FindingStatus {
  if (value === "confirmed") {
    return "Confirmed";
  }

  if (value === "false_positive") {
    return "False positive";
  }

  if (value === "accepted_risk") {
    return "Accepted risk";
  }

  if (value === "fixed") {
    return "Fixed";
  }

  if (value === "archived") {
    return "Archived";
  }

  if (value === "needs_review") {
    return "Needs review";
  }

  return "Ready for review";
}

function formatDate(value: string): string {
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

export function mapEvidence(evidence: ApiEvidence, findings: ApiFinding[]): EvidenceItem {
  const linkedFinding = findings.find((finding) => finding.evidence_ids.includes(evidence.id));
  const metadataOutput = asStringArray(evidence.metadata.output);
  const output = evidence.content ? evidence.content.split(/\r?\n/).filter(Boolean) : metadataOutput;
  const status = evidenceStatus(evidence, findings);

  return {
    id: evidence.id,
    title: evidence.title,
    type: evidenceType(evidence.type),
    sourceStep: evidence.step_id ? `Step ${evidence.step_id.slice(0, 8)}` : "Session evidence",
    linkedFinding: linkedFinding?.id,
    status,
    size: evidence.metadata.size_bytes ? `${String(evidence.metadata.size_bytes)} B` : undefined,
    createdBy: {
      name: evidence.created_by_agent ? "Agent" : "Reviewer",
      initials: evidence.created_by_agent ? "AG" : "RV",
      tone: evidence.created_by_agent ? "blue" : "teal",
    },
    createdAt: formatDate(evidence.created_at),
    createdAtShort: `${formatDate(evidence.created_at).replace(", ", "\n")}`,
    summary: evidence.summary,
    command: asString(evidence.metadata.command),
    output: output.length > 0 ? output : [evidence.summary],
    evidenceId: evidence.id,
    toolCall: evidence.tool_call_id ?? "--",
    step: evidence.step_id ?? "--",
    session: evidence.session_id,
    fileAsset: evidence.asset_id ?? "Inline content",
    sha256: asString(evidence.metadata.sha256, "--"),
    auditTrail: [
      {
        time: formatEventTime(evidence.created_at),
        actor: evidence.created_by_agent ? "Agent" : "Reviewer",
        action: "Evidence created",
      },
      ...(linkedFinding
        ? [
            {
              time: formatEventTime(linkedFinding.updated_at),
              actor: linkedFinding.reviewed_by ?? "Reviewer",
              action: `Linked finding ${linkedFinding.id}`,
            },
          ]
        : []),
    ],
  };
}

export function mapFinding(finding: ApiFinding, evidenceItems: EvidenceItem[]): CandidateFinding {
  return {
    id: finding.id,
    title: finding.title,
    createdBy: finding.created_by_agent ? "Analyst Agent" : "Reviewer",
    createdAt: formatDate(finding.created_at),
    severity: severity(finding.severity),
    confidence: confidence(finding.confidence),
    status: findingStatus(finding.status),
    description: finding.description,
    impact: finding.impact,
    remediation: finding.remediation,
    evidenceLinks: finding.evidence_ids.map((evidenceId) => ({
      id: evidenceId,
      title: evidenceItems.find((item) => item.id === evidenceId)?.title ?? evidenceId,
    })),
    reportInclusion: ["confirmed", "accepted_risk", "fixed"].includes(finding.status) ? "Include in report" : "Keep internal only",
    reviewer: {
      name: finding.reviewed_by ?? "Unassigned",
      initials: (finding.reviewed_by ?? "UA").slice(0, 2).toUpperCase(),
      tone: finding.reviewed_by ? "teal" : "slate",
    },
    reviewedAt: finding.review_note ? formatDate(finding.updated_at) : undefined,
  };
}
