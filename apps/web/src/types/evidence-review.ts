import type { LucideIcon } from "lucide-react";

export type EvidenceType = "terminal" | "file" | "database" | "note";
export type EvidenceStatus = "reviewed" | "candidate" | "confirmed";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type Confidence = "Low" | "Medium" | "High";
export type FindingStatus =
  | "Needs review"
  | "Ready for review"
  | "Confirmed"
  | "False positive"
  | "Accepted risk"
  | "Fixed"
  | "Archived";
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

export interface ApiEvidence {
  id: string;
  project_id: string;
  session_id: string;
  task_id: string | null;
  step_id: string | null;
  tool_call_id: string | null;
  type: string;
  title: string;
  summary: string;
  content: string | null;
  asset_id: string | null;
  metadata: Record<string, unknown>;
  created_by_agent: boolean;
  created_at: string;
}

export interface ApiFinding {
  id: string;
  project_id: string;
  session_id: string;
  title: string;
  status: string;
  severity: string;
  confidence: string;
  affected_assets: unknown[];
  description: string;
  impact: string;
  reproduction_steps: string;
  remediation: string;
  references: unknown[];
  evidence_ids: string[];
  created_by_agent: boolean;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FindingReviewRequest {
  status: string;
  review_note?: string | null;
}

export interface FindingUpdateRequest {
  title?: string | null;
  severity?: string | null;
  confidence?: string | null;
  description?: string | null;
  impact?: string | null;
  reproduction_steps?: string | null;
  remediation?: string | null;
  status?: string | null;
}
