// Forderbar collection workflow: pure state transitions, no network or payment actions.
// This module cannot send demands or activate licensed debt collection on its own.
export const STATES = Object.freeze({
  SUBMITTED: "SUBMITTED",
  SCREENING: "SCREENING",
  REJECTED: "REJECTED",
  EVIDENCE_REQUIRED: "EVIDENCE_REQUIRED",
  APPROVED: "APPROVED",
  ACCOUNT_ACTIVE: "ACCOUNT_ACTIVE",
  MANDATED: "MANDATED",
  DEMAND_APPROVAL: "DEMAND_APPROVAL",
  DEMAND_SENT: "DEMAND_SENT",
  MONITORING: "MONITORING",
  COLLECTION_REVIEW: "COLLECTION_REVIEW",
  COLLECTION_ACTIVE: "COLLECTION_ACTIVE",
  PAYMENT_UNCERTAIN: "PAYMENT_UNCERTAIN",
  PAID: "PAID",
  DISPUTED: "DISPUTED"
});

export function canAcceptCase(review) {
  return Boolean(review?.legalBasisConfirmed && review?.evidenceSufficient &&
    review?.debtorIdentified && review?.economicViabilityConfirmed &&
    review?.qualifiedApproval);
}

export function canActivateCollection(caseData) {
  return Boolean(
    caseData?.accepted && caseData?.accountActive && caseData?.mandateValid &&
    caseData?.outstandingAmount > 0 && caseData?.matured &&
    caseData?.defaultVerified && caseData?.paymentStatusVerified &&
    !caseData?.materialDispute && !caseData?.legalHold &&
    caseData?.licensedOperatorReady && caseData?.feeBasisReviewed
  );
}

export function collectionDecision(caseData, now = new Date()) {
  if (!caseData?.accepted) return { status: "BLOCKED", reason: "Case not accepted" };
  if (caseData?.paymentUncertain) return { status: STATES.PAYMENT_UNCERTAIN, reason: "Payment reconciliation required" };
  if (caseData?.outstandingAmount <= 0) return { status: STATES.PAID, reason: "No outstanding balance" };
  if (caseData?.materialDispute) return { status: STATES.DISPUTED, reason: "Qualified dispute review required" };
  if (caseData?.legalHold) return { status: "BLOCKED", reason: "Legal hold" };
  if (!caseData?.mandateValid || !caseData?.accountActive) return { status: "BLOCKED", reason: "Account or mandate missing" };
  if (!caseData?.matured || !caseData?.defaultVerified) return { status: STATES.MONITORING, reason: "Maturity/default not established" };
  if (!caseData?.paymentStatusVerified) return { status: STATES.PAYMENT_UNCERTAIN, reason: "Outstanding payment not verified" };
  if (!caseData?.licensedOperatorReady || !caseData?.feeBasisReviewed) return { status: STATES.COLLECTION_REVIEW, reason: "Regulatory and fee review required" };
  if (!canActivateCollection(caseData)) return { status: "BLOCKED", reason: "Activation prerequisites incomplete" };
  return { status: STATES.COLLECTION_REVIEW, reason: "Eligible for qualified activation; no automated dispatch", reviewedAt: now.toISOString() };
}

export function monitoringDueAt(sentAt, days = 15) {
  const sent = new Date(sentAt);
  if (!Number.isFinite(sent.getTime()) || !Number.isInteger(days) || days < 1) throw new Error("Invalid monitoring inputs");
  return new Date(sent.getTime() + days * 86400000).toISOString();
}

export function initialRoute({ priorDemand, defaultVerified }) {
  return priorDemand && defaultVerified ? STATES.COLLECTION_REVIEW : STATES.DEMAND_APPROVAL;
}
