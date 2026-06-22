import { reportBuilderMock } from "@/mocks/report-builder";
import type {
  ApiReport,
  ExportAsset,
  ExportHistoryItem,
  FindingStatus,
  ReportBuilderMock,
  ReportConfidence,
  ReportFinding,
  ReportSeverity,
  RiskSummaryItem,
} from "@/types/report-builder";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function humanize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reportStatus(value: string): "Draft" | "Finalized" {
  return value === "final" || value === "finalized" ? "Finalized" : "Draft";
}

function severity(value: string): ReportSeverity {
  const normalized = humanize(value);

  if (normalized === "High" || normalized === "Medium" || normalized === "Low") {
    return normalized;
  }

  return "Info";
}

function confidence(value: string): ReportConfidence {
  const normalized = humanize(value);

  if (normalized === "High" || normalized === "Medium") {
    return normalized;
  }

  return "Low";
}

function findingStatus(value: string): FindingStatus {
  const normalized = humanize(value);

  if (normalized === "Accepted Risk" || normalized === "False Positive" || normalized === "Needs Review") {
    return normalized;
  }

  if (normalized === "Confirmed" || normalized === "Fixed" || normalized === "Candidate" || normalized === "Archived") {
    return normalized;
  }

  return "Candidate";
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

function findingsFromContent(report: ApiReport): ReportFinding[] {
  const findings = asArray(report.content.findings);

  return findings.map((item, index) => {
    const finding = asObject(item);
    const evidence = asArray(finding.evidence);

    return {
      id: asString(finding.id, `finding-${index + 1}`),
      title: asString(finding.title, `Finding ${index + 1}`),
      severity: severity(asString(finding.severity, "info")),
      confidence: confidence(asString(finding.confidence, "low")),
      status: findingStatus(asString(finding.status, "candidate")),
      evidenceCount: evidence.length,
      section: "Findings",
    };
  });
}

function riskSummary(findings: ReportFinding[]): RiskSummaryItem[] {
  const total = Math.max(findings.length, 1);
  const severities: ReportSeverity[] = ["High", "Medium", "Low", "Info"];

  return severities.map((item) => {
    const count = findings.filter((finding) => finding.severity === item).length;

    return {
      severity: item,
      count,
      percent: Math.round((count / total) * 100),
    };
  });
}

function exportAssets(report: ApiReport): ExportAsset[] {
  if (!report.asset_id) {
    return [];
  }

  return [
    {
      name: `${report.title}.${report.format === "json" ? "json" : "md"}`,
      kind: report.format === "json" ? "JSON" : "MD",
      size: "Stored asset",
      generatedAgo: formatDate(report.updated_at),
    },
  ];
}

function exportHistory(report: ApiReport): ExportHistoryItem[] {
  if (!report.asset_id) {
    return [];
  }

  return [
    {
      id: report.asset_id,
      format: report.format === "json" ? "JSON (.json)" : "Markdown (.md)",
      kind: report.format === "json" ? "JSON" : "MD",
      status: "Completed",
      fileName: `${report.title}.${report.format === "json" ? "json" : "md"}`,
      size: "Stored asset",
      generatedBy: "ScopeForge",
      renderer: "backend",
      generatedAt: formatDate(report.updated_at),
    },
  ];
}

export function mapReportBuilderData(report: ApiReport): ReportBuilderMock {
  const contentSession = asObject(report.content.session);
  const findings = findingsFromContent(report);

  return {
    ...reportBuilderMock,
    title: report.title,
    status: reportStatus(report.status),
    sessionName: asString(contentSession.title, `Session ${report.session_id.slice(0, 8)}`),
    findings: findings.length > 0 ? findings : reportBuilderMock.findings,
    riskSummary: findings.length > 0 ? riskSummary(findings) : reportBuilderMock.riskSummary,
    evidence: reportBuilderMock.evidence,
    exportAssets: exportAssets(report),
    exportHistory: exportHistory(report),
  };
}
