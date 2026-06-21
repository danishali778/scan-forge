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
