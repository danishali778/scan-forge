import type { ApiSessionSummary } from "@/types/api";
import type { ApiEvidence, ApiFinding } from "@/types/evidence-review";
import type {
  ApiReport,
  EvidenceReference,
  ExportAsset,
  ExportHistoryItem,
  FindingStatus,
  ReadinessItem,
  ReportBuilderData,
  ReportCollaborator,
  ReportConfidence,
  ReportFinding,
  ReportSection,
  ReportSeverity,
  ReportStatusOption,
  RiskSummaryItem,
  ScopeSummary,
} from "@/types/report-builder";

const reportFindingStatuses = new Set<FindingStatus>(["Confirmed", "Accepted Risk", "Fixed"]);

export const defaultReportStatuses: ReportStatusOption[] = [
  { id: "Confirmed", label: "Confirmed", included: true },
  { id: "Accepted Risk", label: "Accepted Risk", included: true },
  { id: "Fixed", label: "Fixed", included: true },
  { id: "Candidate", label: "Candidate", included: false },
  { id: "Needs Review", label: "Needs Review", included: false },
  { id: "False Positive", label: "False Positive", included: false },
  { id: "Archived", label: "Archived", included: false },
];

export const defaultReportSections: ReportSection[] = [
  {
    id: "executive-summary",
    title: "Executive Summary",
    description: "Overview of key findings and risk posture",
    enabled: true,
    metric: "Generated",
    complete: false,
  },
  {
    id: "scope-methodology",
    title: "Scope & Methodology",
    description: "Session objective and assessment scope",
    enabled: true,
    metric: "Backend",
    complete: false,
  },
  {
    id: "findings",
    title: "Findings",
    description: "Reviewed findings included in this report",
    enabled: true,
    metric: "0 findings",
    complete: false,
  },
  {
    id: "risk-summary",
    title: "Risk Summary",
    description: "Risk distribution from included findings",
    enabled: true,
    metric: "0 risks",
    complete: false,
  },
  {
    id: "evidence-references",
    title: "Evidence References",
    description: "Linked evidence and artifacts",
    enabled: true,
    metric: "0 items",
    complete: false,
  },
  {
    id: "remediation",
    title: "Remediation Recommendations",
    description: "Actionable next steps",
    enabled: true,
    metric: "Generated",
    complete: false,
  },
  {
    id: "appendix",
    title: "Appendix",
    description: "Supporting data and references",
    enabled: false,
    metric: "Optional",
    complete: false,
  },
];

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

function findingsFromApi(findings: ApiFinding[]): ReportFinding[] {
  return findings.map((finding) => ({
    id: finding.id,
    title: finding.title,
    severity: severity(finding.severity),
    confidence: confidence(finding.confidence),
    status: findingStatus(finding.status),
    evidenceCount: finding.evidence_ids.length,
    section: "Findings",
  }));
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

export function riskSummary(findings: ReportFinding[]): RiskSummaryItem[] {
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

function evidenceReferences(evidence: ApiEvidence[], report: ApiReport | null): EvidenceReference[] {
  const renderedEvidence = asArray(report?.content.findings).flatMap((item) => asArray(asObject(item).evidence));
  const renderedReferences = renderedEvidence.map((item, index) => {
    const evidenceItem = asObject(item);

    return {
      id: asString(evidenceItem.id, `evidence-${index + 1}`),
      label: asString(evidenceItem.title, asString(evidenceItem.summary, "Rendered evidence")),
    };
  });

  if (renderedReferences.length > 0) {
    return renderedReferences;
  }

  return evidence.map((item) => ({
    id: item.id,
    label: item.title || item.summary,
  }));
}

function exportAssets(report: ApiReport | null): ExportAsset[] {
  if (!report?.asset_id) {
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

function exportHistory(report: ApiReport | null): ExportHistoryItem[] {
  if (!report?.asset_id) {
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

function scopeSummary(session: ApiSessionSummary | null, report: ApiReport | null): ScopeSummary {
  const contentSession = asObject(report?.content.session);

  return {
    project: session?.project_id ? `Project ${session.project_id.slice(0, 8)}` : "No project selected",
    session: session?.title ?? asString(contentSession.title, "No session selected"),
    scope: session?.scope_id ? `Scope ${session.scope_id.slice(0, 8)}` : "No scope selected",
    assetTypes: "Backend evidence and findings",
    testWindow: report ? `Updated ${formatDate(report.updated_at)}` : "No report created",
  };
}

function sectionsWithMetrics(sections: ReportSection[], findings: ReportFinding[], evidence: EvidenceReference[], report: ApiReport | null): ReportSection[] {
  const includedFindings = findings.filter((finding) => reportFindingStatuses.has(finding.status));
  const rendered = report?.status === "rendered" || report?.status === "final";

  return sections.map((section) => {
    if (section.id === "findings") {
      return { ...section, metric: `${includedFindings.length} findings`, complete: includedFindings.length > 0 };
    }
    if (section.id === "risk-summary") {
      return { ...section, metric: `${includedFindings.length} risks`, complete: includedFindings.length > 0 };
    }
    if (section.id === "evidence-references") {
      return { ...section, metric: `${evidence.length} items`, complete: evidence.length > 0 };
    }
    return { ...section, complete: section.id === "appendix" ? section.complete : rendered };
  });
}

function readiness(report: ApiReport | null, findings: ReportFinding[], evidence: EvidenceReference[]): ReadinessItem[] {
  const includedFindings = findings.filter((finding) => reportFindingStatuses.has(finding.status));

  return [
    { label: "Report record exists", complete: Boolean(report) },
    { label: "At least one reviewed finding is included", complete: includedFindings.length > 0 },
    { label: "Included findings have linked evidence", complete: includedFindings.every((finding) => finding.evidenceCount > 0) && includedFindings.length > 0 },
    { label: "Evidence references are available", complete: evidence.length > 0 },
    { label: "Report has been rendered", complete: report?.status === "rendered" || report?.status === "final" },
    { label: "Report metadata complete", complete: Boolean(report?.title) },
  ];
}

function collaborators(currentUserEmail?: string | null): ReportCollaborator[] {
  const name = currentUserEmail ?? "Current user";
  return [{ id: name, name }];
}

export function mapReportBuilderData({
  report,
  session,
  findings,
  evidence,
  currentUserEmail,
  sections = defaultReportSections,
}: {
  report: ApiReport | null;
  session: ApiSessionSummary | null;
  findings: ApiFinding[];
  evidence: ApiEvidence[];
  currentUserEmail?: string | null;
  sections?: ReportSection[];
}): ReportBuilderData {
  const reportFindings = findings.length > 0 ? findingsFromApi(findings) : report ? findingsFromContent(report) : [];
  const references = evidenceReferences(evidence, report);
  const resolvedSections = sectionsWithMetrics(sections, reportFindings, references, report);
  const resolvedCollaborators = collaborators(currentUserEmail);

  return {
    title: report?.title ?? (session ? `${session.title} Report` : "Session Report"),
    status: report ? reportStatus(report.status) : "Draft",
    sessionName: session?.title ?? "No session selected",
    scope: scopeSummary(session, report),
    authors: resolvedCollaborators,
    reviewers: resolvedCollaborators,
    statuses: defaultReportStatuses,
    sections: resolvedSections,
    findings: reportFindings,
    riskSummary: riskSummary(reportFindings.filter((finding) => reportFindingStatuses.has(finding.status))),
    evidence: references,
    exportAssets: exportAssets(report),
    readiness: readiness(report, reportFindings, references),
    exportHistory: exportHistory(report),
    navigation: [],
  };
}
