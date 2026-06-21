import { useQuery } from "@tanstack/react-query";

import { listMemory, searchMemory } from "@/api/memory";
import { pageItems } from "@/lib/apiPages";
import { mapMemoryDocument, mapMemorySearchResult } from "@/lib/memoryMapping";
import type { MemorySearchVisibility } from "@/types/memory-library";

const memoryKeys = {
  documents: ["memory", "documents"] as const,
  search: (query: string, visibility: MemorySearchVisibility, limit: number) =>
    ["memory", "search", query, visibility, limit] as const,
};

function visibilityFilter(value: MemorySearchVisibility): string[] {
  if (value === "All") {
    return ["session", "project", "workspace"];
  }

  return [value.toLowerCase()];
}

export function useMemoryLibrarySearch({
  query,
  visibility,
  limit,
}: {
  query: string;
  visibility: MemorySearchVisibility;
  limit: number;
}) {
  const documents = useQuery({
    queryKey: memoryKeys.documents,
    queryFn: listMemory,
  });

  const search = useQuery({
    queryKey: memoryKeys.search(query, visibility, limit),
    queryFn: () =>
      searchMemory({
        query,
        visibility: visibilityFilter(visibility),
        limit,
      }),
    enabled: query.trim().length > 0,
  });

  return {
    records: pageItems(documents.data).map(mapMemoryDocument),
    searchResults: (search.data?.items ?? []).map(mapMemorySearchResult),
    isLoading: documents.isLoading || search.isLoading,
    error: documents.error ?? search.error,
  };
}
