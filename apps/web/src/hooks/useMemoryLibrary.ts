import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listMemory, createMemory, approveMemory, deleteMemory, promoteMemory, rejectMemory, searchMemory, updateMemory } from "@/api/memory";
import { listProviderProfiles } from "@/api/providerProfiles";
import { pageItems } from "@/lib/apiPages";
import { mapMemoryDocument, mapMemorySearchResult } from "@/lib/memoryMapping";
import type {
  ApiMemoryDocument,
  MemoryCreateRequest,
  MemoryPromoteRequest,
  MemoryReviewRequest,
  MemorySearchVisibility,
  MemoryUpdateRequest,
} from "@/types/memory-library";

const memoryKeys = {
  documents: ["memory", "documents"] as const,
  providerProfiles: ["memory", "provider-profiles"] as const,
  search: (query: string, visibility: MemorySearchVisibility, limit: number, providerProfileId: string | null) =>
    ["memory", "search", query, visibility, limit, providerProfileId] as const,
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
    refetchInterval: 15_000,
  });

  const providerProfiles = useQuery({
    queryKey: memoryKeys.providerProfiles,
    queryFn: listProviderProfiles,
  });

  const defaultProviderProfileId = pageItems(providerProfiles.data)[0]?.id ?? null;

  const search = useQuery({
    queryKey: memoryKeys.search(query, visibility, limit, defaultProviderProfileId),
    queryFn: () =>
      searchMemory({
        query,
        visibility: visibilityFilter(visibility),
        limit,
        provider_profile_id: defaultProviderProfileId,
      }),
    enabled: query.trim().length > 0 && Boolean(defaultProviderProfileId),
  });

  return {
    documents: pageItems(documents.data),
    records: pageItems(documents.data).map(mapMemoryDocument),
    searchResults: (search.data?.items ?? []).map(mapMemorySearchResult),
    providerProfiles: pageItems(providerProfiles.data),
    defaultProviderProfileId,
    isLoading: documents.isLoading || providerProfiles.isLoading || search.isLoading,
    error: documents.error ?? search.error,
    searchRequiresProvider: query.trim().length > 0 && !defaultProviderProfileId,
  };
}

export function useMemoryLibraryActions() {
  const queryClient = useQueryClient();

  const invalidateMemory = async () => {
    await queryClient.invalidateQueries({ queryKey: ["memory"] });
    await queryClient.invalidateQueries({ queryKey: ["workspace", "memory"] });
  };

  const create = useMutation({
    mutationFn: (request: MemoryCreateRequest) => createMemory(request),
    onSuccess: invalidateMemory,
  });

  const update = useMutation({
    mutationFn: ({ documentId, request }: { documentId: string; request: MemoryUpdateRequest }) =>
      updateMemory(documentId, request),
    onSuccess: invalidateMemory,
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => deleteMemory(documentId),
    onSuccess: invalidateMemory,
  });

  const approve = useMutation({
    mutationFn: ({ document, request }: { document: ApiMemoryDocument; request: MemoryReviewRequest }) =>
      approveMemory(document.id, request),
    onSuccess: invalidateMemory,
  });

  const reject = useMutation({
    mutationFn: ({ documentId, request }: { documentId: string; request: MemoryReviewRequest }) =>
      rejectMemory(documentId, request),
    onSuccess: invalidateMemory,
  });

  const promote = useMutation({
    mutationFn: ({ documentId, request }: { documentId: string; request: MemoryPromoteRequest }) =>
      promoteMemory(documentId, request),
    onSuccess: invalidateMemory,
  });

  return {
    create,
    update,
    remove,
    approve,
    reject,
    promote,
    isBusy:
      create.isPending ||
      update.isPending ||
      remove.isPending ||
      approve.isPending ||
      reject.isPending ||
      promote.isPending,
    error: create.error ?? update.error ?? remove.error ?? approve.error ?? reject.error ?? promote.error,
  };
}
