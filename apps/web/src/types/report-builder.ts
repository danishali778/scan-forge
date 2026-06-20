import type { LucideIcon } from "lucide-react";

export type ReportSeverity = "High" | "Medium" | "Low" | "Info";
export type ReportConfidence = "High" | "Medium" | "Low";
export type FindingStatus =
  | "Confirmed"
  | "Accepted Risk"
  | "Fixed"
  | "Candidate"
  | "Needs Review"
  | "False Positive"
  | "Archived";
export type ReportAssetKind = "MD" | "JSON";

export type ReportNavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  danger?: boolean;
};

export type ReportStatusOption = {
  id: FindingStatus;
  label: FindingStatus;
  included: boolean;
};

export type ReportSection = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  metric: string;
  complete: boolean;
};

export type ReportFinding = {
  id: string;
  title: string;
  severity: ReportSeverity;
  confidence: ReportConfidence;
  status: FindingStatus;
  evidenceCount: number;
  section: string;
};

export type RiskSummaryItem = {
  severity: ReportSeverity;
  count: number;
  percent: number;
};

export type EvidenceReference = {
  id: string;
  label: string;
};

export type ExportAsset = {
  name: string;
  kind: ReportAssetKind;
  size: string;
  generatedAgo: string;
};

export type ReadinessItem = {
  label: string;
  complete: boolean;
};

export type ExportHistoryItem = {
  id: string;
  format: string;
  kind: ReportAssetKind;
  status: "Completed" | "Queued" | "Failed";
  fileName: string;
  size: string;
  generatedBy: string;
  renderer: string;
  generatedAt: string;
};

export type ScopeSummary = {
  project: string;
  session: string;
  scope: string;
  assetTypes: string;
  testWindow: string;
};

export type ReportCollaborator = {
  id: string;
  name: string;
};

export type ReportBuilderMock = {
  title: string;
  status: "Draft" | "Finalized";
  sessionName: string;
  scope: ScopeSummary;
  authors: ReportCollaborator[];
  reviewers: ReportCollaborator[];
  statuses: ReportStatusOption[];
  sections: ReportSection[];
  findings: ReportFinding[];
  riskSummary: RiskSummaryItem[];
  evidence: EvidenceReference[];
  exportAssets: ExportAsset[];
  readiness: ReadinessItem[];
  exportHistory: ExportHistoryItem[];
  navigation: ReportNavItem[];
};
