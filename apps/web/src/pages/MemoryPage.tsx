import { useMemo, useState } from "react";

import { MemoryHeader } from "@/components/memory-library/MemoryHeader";
import { MemorySearchPanel } from "@/components/memory-library/MemorySearchPanel";
import { MemorySidebar } from "@/components/memory-library/MemorySidebar";
import { MemoryStatusTabs } from "@/components/memory-library/MemoryStatusTabs";
import { MemoryTable } from "@/components/memory-library/MemoryTable";
import { MemoryToolbar } from "@/components/memory-library/MemoryToolbar";
import { SelectedMemoryPanel } from "@/components/memory-library/SelectedMemoryPanel";
import {
  approvedMemorySearchResults,
  initialMemoryFilters,
  memoryRecords,
  newMemoryDraft,
} from "@/mocks/memory-library";
import type {
  MemoryFilterState,
  MemoryRecord,
  MemorySearchVisibility,
  MemoryStatus,
  MemoryTabKey,
} from "@/types/memory-library";

const openStatuses: MemoryStatus[] = ["Candidate", "Approved", "Rejected", "Blocked"];

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
  const matchesTab = activeTab === "Candidate" ? memory.status !== "Archived" : memory.status === activeTab;
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
  const [records, setRecords] = useState(memoryRecords);
  const [filters, setFilters] = useState(initialMemoryFilters);
  const [activeTab, setActiveTab] = useState<MemoryTabKey>("Candidate");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>("api-token-handling");
  const [checkedMemoryIds, setCheckedMemoryIds] = useState<string[]>(["auth-flow-behavior"]);
  const [reviewNote, setReviewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("How do we handle tokens in scripts?");
  const [searchVisibility, setSearchVisibility] = useState<MemorySearchVisibility>("All");
  const [searchLimit, setSearchLimit] = useState(5);

  const visibleMemories = useMemo(
    () => records.filter((memory) => matchesFilters(memory, filters, activeTab)),
    [activeTab, filters, records]
  );

  const selectedMemory = useMemo(
    () => records.find((memory) => memory.id === selectedMemoryId) ?? null,
    [records, selectedMemoryId]
  );

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return approvedMemorySearchResults
      .filter((result) => searchVisibility === "All" || result.visibility === searchVisibility)
      .filter((result) => {
        if (!query) {
          return true;
        }

        return [result.chunkPreview, result.fromTitle, result.fromDoc, result.scope, result.relevance]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, searchLimit);
  }, [searchLimit, searchQuery, searchVisibility]);

  const updateSelectedMemory = (updates: Partial<MemoryRecord>) => {
    if (!selectedMemoryId) {
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.map((memory) =>
        memory.id === selectedMemoryId ? { ...memory, ...updates, reviewedBy: "Danish Ali", updatedAt: "Just now" } : memory
      )
    );
  };

  const handleCreateMemory = () => {
    setRecords((currentRecords) => {
      if (currentRecords.some((memory) => memory.id === newMemoryDraft.id)) {
        return currentRecords;
      }

      return [newMemoryDraft, ...currentRecords];
    });
    setSelectedMemoryId(newMemoryDraft.id);
    setCheckedMemoryIds((currentIds) =>
      currentIds.includes(newMemoryDraft.id) ? currentIds : [newMemoryDraft.id, ...currentIds]
    );
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

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-w-[1560px]">
        <MemorySidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <MemoryHeader />
          <MemoryToolbar filters={filters} onFiltersChange={setFilters} onCreateMemory={handleCreateMemory} />

          <div className="min-h-0 flex-1 px-5 pt-6">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="min-h-0 flex flex-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  <MemoryStatusTabs activeTab={activeTab} onTabChange={setActiveTab} />
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
                  onApprove={() => updateSelectedMemory({ status: "Approved", embedding: "Pending" })}
                  onReject={() => updateSelectedMemory({ status: "Rejected", embedding: "None" })}
                  onPromote={() =>
                    updateSelectedMemory({
                      visibility: "Workspace",
                      status: "Approved",
                      embedding: "Pending",
                      project: "All projects",
                      session: "All sessions",
                      scope: { workspace: "Acme Security" },
                    })
                  }
                  onClose={() => setSelectedMemoryId(null)}
                />
              </div>

              <MemorySearchPanel
                query={searchQuery}
                visibility={searchVisibility}
                limit={searchLimit}
                results={searchResults}
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
