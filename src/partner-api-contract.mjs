// Forderbar partner API contract, v1. This is an interface specification, not a live endpoint.
// POST /api/v1/partner/cases
// Authorization: Bearer <partner-issued OAuth2 access token>
// Idempotency-Key: <stable unique partner event key>
// Payload example:
// {
//   "external_case_id": "VZ-12345",
//   "consumer": {"external_id": "C-42", "email": "consumer@example.invalid"},
//   "claim": {"category": "retail_refund", "amount_cents": 4990, "currency": "EUR",
//     "debtor": {"legal_name": "Example GmbH"}, "prior_demand": {"sent_at": null}},
//   "documents": [{"file_token": "upload-token"}],
//   "consent": {"consumer_transfer_authorized": true, "recorded_at": "2026-10-31T10:00:00Z", "scope": "claim-referral"}
// }
// Return 202: { "case_id": "internal-id", "status": "SCREENING", "consumer_account": "PENDING_VERIFICATION" }
// GET /api/v1/partner/cases/:id/status
// POST /api/v1/partner/webhooks/test
//
// Integration requirements:
// - Partner organization approved and issued scoped credentials.
// - OAuth2 client credentials or equivalent server-to-server auth, rate limits, audit log and tenant isolation.
// - No partner can retrieve another partner's cases.
// - Consumer transfer consent and source evidence verified before processing.
// - Idempotency key prevents duplicate cases and duplicate messages.
// - Uploaded documents use short-lived signed upload tokens and malware scanning.
// - Consumer account created provisionally, activated only after claim acceptance and email verification.
// - AI pre-screening never constitutes a binding legal decision without required oversight.
// - Webhook callbacks are signed, retryable and contain minimal personal data.
// - Real endpoints and credentials must be created in a secured backend; no secrets in static site.
export const PARTNER_CASE_API_VERSION = "v1";
export const PARTNER_CASE_STATES = ["RECEIVED", "SCREENING", "MORE_EVIDENCE", "DECLINED", "APPROVED", "ACCOUNT_PENDING", "MANDATE_PENDING", "DEMAND_SENT", "MONITORING", "COLLECTION_REVIEW", "COLLECTION_ACTIVE", "SETTLED", "CLOSED"];
export function validatePartnerCase(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return { valid: false, errors: ["Missing payload"] };
  if (!payload.external_case_id || typeof payload.external_case_id !== "string") errors.push("external_case_id required");
  if (!payload.consumer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.consumer.email)) errors.push("consumer.email invalid");
  if (!Number.isSafeInteger(payload.claim?.amount_cents) || payload.claim.amount_cents <= 0) errors.push("claim.amount_cents must be positive integer");
  if (payload.claim?.currency !== "EUR") errors.push("claim.currency must be EUR");
  if (!payload.claim?.debtor?.legal_name) errors.push("claim.debtor.legal_name required");
  if (payload.consent?.consumer_transfer_authorized !== true || payload.consent?.scope !== "claim-referral" || !payload.consent?.recorded_at) errors.push("consumer referral authorization required");
  return { valid: errors.length === 0, errors };
}
