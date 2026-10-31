// Forderbar legal assessment routing: configuration-neutral, no external API requests.
// Legal-source provenance and qualified review remain mandatory.
export const LEGAL_REVIEW = Object.freeze({
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  SPECIALIST_REVIEW: "SPECIALIST_REVIEW",
  SECOND_OPINION: "SECOND_OPINION",
  QUALIFIED_HUMAN_REVIEW: "QUALIFIED_HUMAN_REVIEW"
});
export function routeLegalAssessment(assessment) {
  if (!assessment?.documentsAvailable || !assessment?.claimAmount || !assessment?.debtorIdentified)
    return { status: LEGAL_REVIEW.INSUFFICIENT_EVIDENCE, mayAccept: false };
  if (!assessment?.verifiedLegalSources || !assessment?.sourceReferences?.length)
    return { status: LEGAL_REVIEW.SPECIALIST_REVIEW, mayAccept: false };
  if (assessment?.disputed || assessment?.contradictoryEvidence || assessment?.highStakes)
    return { status: LEGAL_REVIEW.QUALIFIED_HUMAN_REVIEW, mayAccept: false };
  if (assessment?.specialistUncertain)
    return { status: LEGAL_REVIEW.SECOND_OPINION, mayAccept: false };
  return { status: LEGAL_REVIEW.SPECIALIST_REVIEW, mayAccept: false,
    reason: "Specialist findings require deterministic rule checks and authorized approval" };
}
