import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { MemoryHeader } from "@/components/memory-library/MemoryHeader";
import { MemorySearchPanel } from "@/components/memory-library/MemorySearchPanel";
import { MemoryStatusTabs } from "@/components/memory-library/MemoryStatusTabs";
import { MemoryTable } from "@/components/memory-library/MemoryTable";
import { MemoryToolbar } from "@/components/memory-library/MemoryToolbar";
import { SelectedMemoryPanel } from "@/components/memory-library/SelectedMemoryPanel";
import { useMemoryLibraryActions, useMemoryLibrarySearch } from "@/hooks/useMemoryLibrary";
import { getErrorMessage } from "@/lib/errors";
import type {
  MemoryFilterState,
  MemoryRecord,
  MemorySearchVisibility,
  MemoryStatus,
  MemoryTabKey,
  MemoryUpdateRequest,
} from "@/types/memory-library";

const openStatuses: MemoryStatus[] = ["Candidate", "Approved", "Rejected", "Blocked"];
const initialMemoryFilters: MemoryFilterState = {
  query: "",
  visibility: "All",
  source: "All",
  status: "Open",
  project: "All projects",
  session: "All sessions",
};

function matchesText(memory: MemoryRecord, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    memory.title,
    memory.subtitle,
    memory.summary,
    memory.contentPreview,
    memory.project,
    memory.session,
    memory.sourceContext,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function matchesFilters(memory: MemoryRecord, filters: MemoryFilterState, activeTab: MemoryTabKey) {
  const matchesTab = memory.status === activeTab;
  const matchesStatus =
    filters.status === "All"
      ? true
      : filters.status === "Open"
        ? openStatuses.includes(memory.status)
        : memory.status === filters.status;

  return (
    matchesTab &&
    matchesStatus &&
    matchesText(memory, filters.query.trim()) &&
    (filters.visibility === "All" || memory.visibility === filters.visibility) &&
    (filters.source === "All" || memory.source === filters.source) &&
    (filters.project === "All projects" || memory.project === filters.project) &&
    (filters.session === "All sessions" || memory.session === filters.session)
  );
}

export function MemoryPage() {
  const [filters, setFilters] = useState(initialMemoryFilters);
  const [activeTab, setActiveTab] = useState<MemoryTabKey>("Candidate");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [checkedMemoryIds, setCheckedMemoryIds] = useState<string[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisibility, setSearchVisibility] = useState<MemorySearchVisibility>("All");
  const [searchLimit, setSearchLimit] = useState(5);
  const backend = useMemoryLibrarySearch({
    query: searchQuery,
    visibility: searchVisibility,
    limit: searchLimit,
  });
  const actions = useMemoryLibraryActions();
  const sourceRecords = backend.records;

  useEffect(() => {
    if (sourceRecords.length === 0) {
      setSelectedMemoryId(null);
      return;
    }

    if (!selectedMemoryId || !sourceRecords.some((memory) => memory.id === selectedMemoryId)) {
      setSelectedMemoryId(sourceRecords[0].id);
    }
  }, [selectedMemoryId, sourceRecords]);

  const visibleMemories = useMemo(
    () => sourceRecords.filter((memory) => matchesFilters(memory, filters, activeTab)),
    [activeTab, filters, sourceRecords]
  );

  const selectedMemory = useMemo(
    () => sourceRecords.find((memory) => memory.id === selectedMemoryId) ?? sourceRecords[0] ?? null,
    [selectedMemoryId, sourceRecords]
  );

  const selectedDocument = useMemo(
    () => backend.documents.find((document) => document.id === selectedMemory?.id) ?? null,
    [backend.documents, selectedMemory?.id]
  );

  const statusCounts = useMemo(
    () =>
      sourceRecords.reduce<Record<MemoryTabKey, number>>(
        (counts, memory) => {
          counts[memory.status] += 1;
          return counts;
        },
        { Candidate: 0, Approved: 0, Rejected: 0, Archived: 0, Blocked: 0 }
      ),
    [sourceRecords]
  );

  const projectOptions = useMemo(
    () => ["All projects", ...Array.from(new Set(sourceRecords.map((memory) => memory.project).filter(Boolean)))],
    [sourceRecords]
  );

  const sessionOptions = useMemo(
    () => ["All sessions", ...Array.from(new Set(sourceRecords.map((memory) => memory.session).filter(Boolean)))],
    [sourceRecords]
  );

  const handleCreateMemory = () => {
    actions.create.mutate(
      {
        title: "Manual memory candidate",
        summary: "Draft reusable knowledge created from the Memory page.",
        content: "Replace this draft with reviewed knowledge before approving it for agent retrieval.",
        visibility: "workspace",
        source_type: "manual",
        provider_profile_id: backend.defaultProviderProfileId,
        metadata: { created_from: "memory_page" },
      },
      {
        onSuccess: (document) => {
          setSelectedMemoryId(document.id);
          setCheckedMemoryIds((currentIds) =>
            currentIds.includes(document.id) ? currentIds : [document.id, ...currentIds]
          );
        },
      }
    );
  };

  const handleApproveMemory = () => {
    if (!selectedDocument) {
      return;
    }

    actions.approve.mutate({
      document: selectedDocument,
      request: {
        review_note: reviewNote || null,
        provider_profile_id: selectedDocument.provider_profile_id ?? backend.defaultProviderProfileId,
      },
    });
  };

  const handleRejectMemory = () => {
    if (!selectedMemoryId) {
      return;
    }

    actions.reject.mutate({
      documentId: selectedMemoryId,
      request: { review_note: reviewNote || null },
    });
  };

  const handlePromoteMemory = () => {
    if (!selectedMemory) {
      return;
    }

    actions.promote.mutate({
      documentId: selectedMemory.id,
      request: {
        visibility: selectedMemory.visibility === "Session" ? "project" : "workspace",
        review_note: reviewNote || null,
      },
    });
  };

  const handleUpdateMemory = (request: MemoryUpdateRequest) => {
    if (!selectedMemoryId) {
      return;
    }

    actions.update.mutate({
      documentId: selectedMemoryId,
      request,
    });
  };

  const handleToggleMemory = (memoryId: string) => {
    setCheckedMemoryIds((currentIds) =>
      currentIds.includes(memoryId) ? currentIds.filter((id) => id !== memoryId) : [...currentIds, memoryId]
    );
  };

  const handleToggleAll = () => {
    const visibleIds = visibleMemories.map((memory) => memory.id);
    const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => checkedMemoryIds.includes(id));

    setCheckedMemoryIds((currentIds) =>
      allVisibleChecked
        ? currentIds.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...currentIds, ...visibleIds]))
    );
  };

  const selectedProviderProfileId = selectedDocument?.provider_profile_id ?? backend.defaultProviderProfileId;
  const canApprove =
    Boolean(selectedMemory) &&
    selectedMemory?.status !== "Approved" &&
    selectedMemory?.secretScan !== "Flagged" &&
    Boolean(selectedProviderProfileId);
  const canPromote = Boolean(selectedMemory) && selectedMemory?.status === "Approved" && selectedMemory?.visibility !== "Workspace";
  const actionMessage = !backend.defaultProviderProfileId
    ? "Memory approval and semantic search require at least one provider profile with embeddings configured."
    : selectedMemory?.secretScan === "Flagged"
      ? "Secret scan flagged this memory. Edit the content before approval."
      : actions.error
        ? getErrorMessage(actions.error)
        : backend.searchRequiresProvider
          ? "Memory search requires a provider profile with embeddings configured."
          : null;

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full">
        <AppSidebar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MemoryHeader />
          <div className="overflow-x-auto border-b border-slate-200 bg-white">
            <div className="min-w-[1460px]">
              <MemoryToolbar
                filters={filters}
                projectOptions={projectOptions}
                sessionOptions={sessionOptions}
                onFiltersChange={setFilters}
                onCreateMemory={handleCreateMemory}
                isCreating={actions.create.isPending}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-5 pt-6">
            {backend.error || actions.error ? (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                {getErrorMessage(backend.error ?? actions.error)}
              </div>
            ) : null}
            {backend.isLoading ? (
              <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                Loading backend memory...
              </div>
            ) : null}
            <div className="flex h-full min-h-[760px] min-w-[1460px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="min-h-0 flex flex-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  <MemoryStatusTabs activeTab={activeTab} counts={statusCounts} onTabChange={setActiveTab} />
                  <MemoryTable
                    memories={visibleMemories}
                    checkedMemoryIds={checkedMemoryIds}
                    selectedMemoryId={selectedMemoryId}
                    onSelectMemory={setSelectedMemoryId}
                    onToggleMemory={handleToggleMemory}
                    onToggleAll={handleToggleAll}
                  />
                </div>

                <SelectedMemoryPanel
                  memory={selectedMemory}
                  reviewNote={reviewNote}
                  onReviewNoteChange={setReviewNote}
                  onApprove={handleApproveMemory}
                  onReject={handleRejectMemory}
                  onPromote={handlePromoteMemory}
                  onUpdate={handleUpdateMemory}
                  onClose={() => setSelectedMemoryId(null)}
                  isBusy={actions.isBusy}
                  canApprove={canApprove}
                  canPromote={canPromote}
                  actionMessage={actionMessage}
                />
              </div>

              <MemorySearchPanel
                query={searchQuery}
                visibility={searchVisibility}
                limit={searchLimit}
                results={backend.searchResults}
                onQueryChange={setSearchQuery}
                onVisibilityChange={setSearchVisibility}
                onLimitChange={setSearchLimit}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default MemoryPage;
