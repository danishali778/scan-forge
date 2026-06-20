import type { LucideIcon } from "lucide-react";

export type EvidenceType = "terminal" | "file" | "database" | "note";
export type EvidenceStatus = "reviewed" | "candidate" | "confirmed";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type Confidence = "Low" | "Medium" | "High";
export type FindingStatus = "Needs review" | "Ready for review" | "Approved";
export type EvidenceTone = "teal" | "blue" | "green" | "amber" | "red" | "slate";

export interface EvidenceNavItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
}

export interface EvidenceMetric {
  label: string;
  value: string;
  helper: string;
  tone: EvidenceTone;
  icon: LucideIcon;
  progress?: number;
}

export interface EvidenceAuthor {
  name: string;
  initials: string;
  tone: EvidenceTone;
}

export interface EvidenceItem {
  id: string;
  title: string;
  type: EvidenceType;
  sourceStep: string;
  linkedFinding?: string;
  status: EvidenceStatus;
  size?: string;
  createdBy: EvidenceAuthor;
  createdAt: string;
  createdAtShort: string;
  summary: string;
  command?: string;
  output: string[];
  evidenceId: string;
  toolCall: string;
  step: string;
  session: string;
  fileAsset: string;
  sha256: string;
  auditTrail: { time: string; actor: string; action: string }[];
}

export interface CandidateFinding {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  severity: Severity;
  confidence: Confidence;
  status: FindingStatus;
  description: string;
  impact: string;
  remediation: string;
  evidenceLinks: { id: string; title: string }[];
  reportInclusion: string;
  reviewer: EvidenceAuthor;
  reviewedAt?: string;
}

export interface EvidenceFiltersState {
  session: string;
  evidenceType: string;
  status: string;
  severity: string;
  reviewer: string;
  dateRange: string;
}

export interface EvidenceSelectOption {
  label: string;
  value: string;
}
