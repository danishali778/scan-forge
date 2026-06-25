import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listSessionEvidence } from "@/api/evidence";
import { listSessionFindings, reviewFinding, updateFinding } from "@/api/findings";
import { listSessions } from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { mapEvidence, mapFinding } from "@/lib/evidenceMapping";
import type { FindingReviewRequest, FindingUpdateRequest } from "@/types/evidence-review";

const evidenceFindingKeys = {
  sessions: ["evidence-findings", "sessions"] as const,
  evidence: (sessionId: string) => ["evidence-findings", sessionId, "evidence"] as const,
  findings: (sessionId: string) => ["evidence-findings", sessionId, "findings"] as const,
};

export function useEvidenceFindings(selectedSessionId?: string) {
  const sessions = useQuery({
    queryKey: evidenceFindingKeys.sessions,
    queryFn: listSessions,
  });
  const sessionItems = pageItems(sessions.data);
  const sessionId =
    selectedSessionId && sessionItems.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : (sessionItems[0]?.id ?? "");

  const evidence = useQuery({
    queryKey: evidenceFindingKeys.evidence(sessionId),
    queryFn: () => listSessionEvidence(sessionId),
    enabled: Boolean(sessionId),
  });

  const findings = useQuery({
    queryKey: evidenceFindingKeys.findings(sessionId),
    queryFn: () => listSessionFindings(sessionId),
    enabled: Boolean(sessionId),
  });

  const apiFindings = pageItems(findings.data);
  const evidenceItems = pageItems(evidence.data).map((item) => mapEvidence(item, apiFindings));
  const candidateFindings = apiFindings.map((finding) => mapFinding(finding, evidenceItems));

  return {
    sessionId,
    sessions: sessionItems,
    evidenceItems,
    candidateFindings,
    isLoading: sessions.isLoading || evidence.isLoading || findings.isLoading,
    error: sessions.error ?? evidence.error ?? findings.error,
  };
}

export function useFindingReview(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const resolvedSessionId = sessionId ?? "";

  return useMutation({
    mutationFn: ({ findingId, request }: { findingId: string; request: FindingReviewRequest }) =>
      reviewFinding(findingId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: evidenceFindingKeys.findings(resolvedSessionId) });
    },
  });
}

export function useFindingSave(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const resolvedSessionId = sessionId ?? "";

  return useMutation({
    mutationFn: async ({
      findingId,
      update,
      review,
    }: {
      findingId: string;
      update: FindingUpdateRequest;
      review?: FindingReviewRequest;
    }) => {
      const updated = await updateFinding(findingId, update);
      return review ? reviewFinding(findingId, review) : updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: evidenceFindingKeys.findings(resolvedSessionId) });
    },
  });
}
