import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listSessionEvidence } from "@/api/evidence";
import { listSessionFindings, reviewFinding } from "@/api/findings";
import { listSessions } from "@/api/sessions";
import { pageItems } from "@/lib/apiPages";
import { mapEvidence, mapFinding } from "@/lib/evidenceMapping";
import type { FindingReviewRequest } from "@/types/evidence-review";

const evidenceFindingKeys = {
  sessions: ["evidence-findings", "sessions"] as const,
  evidence: (sessionId: string) => ["evidence-findings", sessionId, "evidence"] as const,
  findings: (sessionId: string) => ["evidence-findings", sessionId, "findings"] as const,
};

export function useEvidenceFindings() {
  const sessions = useQuery({
    queryKey: evidenceFindingKeys.sessions,
    queryFn: listSessions,
  });
  const sessionId = pageItems(sessions.data)[0]?.id ?? "";

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
