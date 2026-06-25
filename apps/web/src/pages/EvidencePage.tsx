import { EvidenceReviewScreen } from "@/components/evidence-review/EvidenceReviewScreen";
import { useEvidenceFindings, useFindingSave } from "@/hooks/useEvidenceFindings";
import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import type { FindingReviewRequest, FindingUpdateRequest } from "@/types/evidence-review";

export function EvidencePage() {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const review = useEvidenceFindings(selectedSessionId);
  const findingSave = useFindingSave(review.sessionId);
  const sessionOptions = review.sessions.map((session) => ({
    value: session.id,
    label: session.title,
  }));

  const handleSaveFinding = (
    findingId: string,
    update: FindingUpdateRequest,
    reviewRequest?: FindingReviewRequest,
  ) => {
    findingSave.mutate({ findingId, update, review: reviewRequest });
  };

  return (
    <EvidenceReviewScreen
      evidenceItems={review.evidenceItems}
      candidateFindings={review.candidateFindings}
      sessionOptions={sessionOptions}
      selectedSessionId={review.sessionId}
      onSessionChange={setSelectedSessionId}
      onSaveFinding={handleSaveFinding}
      isSavingFinding={findingSave.isPending}
      isLoading={review.isLoading}
      errorMessage={review.error || findingSave.error ? getErrorMessage(review.error ?? findingSave.error) : null}
    />
  );
}

export default EvidencePage;
