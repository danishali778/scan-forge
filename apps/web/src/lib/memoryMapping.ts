import { humanizeStatus } from "@/lib/formatters";
import type {
  ApiMemoryDocument,
  ApiMemorySearchResult,
  EmbeddingStatus,
  MemoryRecord,
  MemorySearchResult,
  MemorySource,
  MemoryStatus,
  MemoryVisibility,
  SecretScanStatus,
} from "@/types/memory-library";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function visibility(value: string): MemoryVisibility {
  const normalized = humanizeStatus(value);

  if (normalized === "Project" || normalized === "Workspace") {
    return normalized;
  }

  return "Session";
}

function source(value: string): MemorySource {
  const normalized = humanizeStatus(value);

  if (normalized === "Finding" || normalized === "Evidence" || normalized === "Manual" || normalized === "Report") {
    return normalized;
  }

  return "Agent";
}

function status(document: ApiMemoryDocument): MemoryStatus {
  if (document.secret_scan_status === "flagged" || document.embedding_status === "blocked") {
    return "Blocked";
  }

  const normalized = humanizeStatus(document.status);

  if (normalized === "Approved" || normalized === "Rejected" || normalized === "Archived") {
    return normalized;
  }

  return "Candidate";
}

function secretScan(value: string): SecretScanStatus {
  return value === "flagged" ? "Flagged" : "Clean";
}

function embedding(value: string): EmbeddingStatus {
  if (value === "embedded") {
    return "Embedded";
  }

  if (value === "blocked" || value === "failed") {
    return "Blocked";
  }

  if (value === "pending") {
    return "Pending";
  }

  return "None";
}

function contentPreview(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();

  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

export function mapMemoryDocument(document: ApiMemoryDocument): MemoryRecord {
  const mappedVisibility = visibility(document.visibility);
  const mappedSource = source(document.source_type);
  const projectLabel = document.project_id ? `Project ${document.project_id.slice(0, 8)}` : "All projects";
  const sessionLabel = document.session_id ? `Session ${document.session_id.slice(0, 8)}` : "All sessions";

  return {
    id: document.id,
    title: document.title,
    subtitle: mappedVisibility === "Workspace" ? "Workspace" : `${mappedVisibility}: ${mappedVisibility === "Session" ? sessionLabel : projectLabel}`,
    visibility: mappedVisibility,
    source: mappedSource,
    status: status(document),
    secretScan: secretScan(document.secret_scan_status),
    embedding: embedding(document.embedding_status),
    chunks: typeof document.metadata.chunk_count === "number" ? document.metadata.chunk_count : null,
    reviewedBy: document.reviewed_by,
    updatedAt: formatDate(document.updated_at),
    summary: document.summary,
    content: document.content,
    contentPreview: contentPreview(document.content),
    sourceLabel: mappedSource,
    sourceContext: document.source_finding_id
      ? `Finding ${document.source_finding_id.slice(0, 8)}`
      : document.source_evidence_id
        ? `Evidence ${document.source_evidence_id.slice(0, 8)}`
        : humanizeStatus(document.source_type),
    scope: {
      workspace: mappedVisibility === "Workspace" ? "Current workspace" : undefined,
      project: document.project_id ? projectLabel : undefined,
      session: document.session_id ? sessionLabel : undefined,
    },
    secretScanDetail: document.secret_scan_status === "flagged" ? "Secret-like content flagged" : "No secrets detected",
    embeddingDetail:
      document.embedding_status === "embedded"
        ? "Embedding ready for retrieval"
        : document.embedding_status === "blocked"
          ? "Embedding blocked by review gate"
          : document.embedding_status === "failed"
            ? "Embedding job failed"
            : "Queued for embedding",
    project: projectLabel,
    session: sessionLabel,
  };
}

export function mapMemorySearchResult(result: ApiMemorySearchResult): MemorySearchResult {
  return {
    id: result.chunk_id,
    score: result.score,
    chunkPreview: contentPreview(result.content),
    fromTitle: result.title,
    fromDoc: result.document_id.slice(0, 8),
    source: source(result.source_type),
    visibility: visibility(result.visibility),
    scope: humanizeStatus(result.visibility),
    agentsReceive: "Yes",
    relevance: result.summary,
  };
}
