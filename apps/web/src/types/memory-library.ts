import type { LucideIcon } from "lucide-react";

export type MemoryVisibility = "Session" | "Project" | "Workspace";
export type MemorySource = "Agent" | "Finding" | "Evidence" | "Manual" | "Report";
export type MemoryStatus = "Candidate" | "Approved" | "Rejected" | "Archived" | "Blocked";
export type MemoryTabKey = MemoryStatus;
export type SecretScanStatus = "Clean" | "Flagged";
export type EmbeddingStatus = "Pending" | "Embedded" | "Blocked" | "None";

export type MemoryNavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
};

export type MemoryScope = {
  project?: string;
  session?: string;
  workspace?: string;
};

export type MemoryRecord = {
  id: string;
  title: string;
  subtitle: string;
  visibility: MemoryVisibility;
  source: MemorySource;
  status: MemoryStatus;
  secretScan: SecretScanStatus;
  embedding: EmbeddingStatus;
  chunks: number | null;
  reviewedBy: string | null;
  updatedAt: string;
  summary: string;
  contentPreview: string;
  sourceLabel: string;
  sourceContext: string;
  scope: MemoryScope;
  secretScanDetail: string;
  embeddingDetail: string;
  project: string;
  session: string;
};

export type MemorySearchResult = {
  id: string;
  score: number;
  chunkPreview: string;
  fromTitle: string;
  fromDoc: string;
  source: MemorySource;
  visibility: MemoryVisibility;
  scope: string;
  agentsReceive: "Yes" | "No";
  relevance: string;
};

export type MemoryFilterState = {
  query: string;
  visibility: "All" | MemoryVisibility;
  source: "All" | MemorySource;
  status: "Open" | "All" | MemoryStatus;
  project: "All projects" | string;
  session: "All sessions" | string;
};

export type MemorySearchVisibility = "All" | MemoryVisibility;

export type ApiMemoryDocument = {
  id: string;
  project_id: string | null;
  session_id: string | null;
  source_evidence_id: string | null;
  source_finding_id: string | null;
  provider_profile_id: string | null;
  title: string;
  summary: string;
  content: string;
  source_type: string;
  visibility: string;
  status: string;
  embedding_status: string;
  secret_scan_status: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiMemorySearchResult = {
  document_id: string;
  chunk_id: string;
  title: string;
  summary: string;
  content: string;
  visibility: string;
  score: number;
  source_type: string;
};

export type MemorySearchRequest = {
  query: string;
  project_id?: string | null;
  session_id?: string | null;
  visibility?: string[];
  limit?: number | null;
  provider_profile_id?: string | null;
};

export type MemorySearchResponse = {
  items: ApiMemorySearchResult[];
};
