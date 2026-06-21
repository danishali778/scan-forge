import { EvidenceReviewScreen } from "@/components/evidence-review/EvidenceReviewScreen";
import { useEvidenceFindings } from "@/hooks/useEvidenceFindings";
import { getErrorMessage } from "@/lib/errors";

export function EvidencePage() {
  const review = useEvidenceFindings();
  const hasBackendData = Boolean(review.sessionId && (review.evidenceItems.length > 0 || review.candidateFindings.length > 0));

  return (
    <EvidenceReviewScreen
      evidenceItems={hasBackendData ? review.evidenceItems : undefined}
      candidateFindings={hasBackendData ? review.candidateFindings : undefined}
      isLoading={review.isLoading}
      errorMessage={review.error ? getErrorMessage(review.error) : null}
    />
  );
}

export default EvidencePage;
