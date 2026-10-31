// Forderbar partner onboarding domain rules. Pure logic; no live accounts or APIs.
export const PARTNER_TYPES = Object.freeze(["verbraucherzentrale", "mieterschutzverein"]);
export const PARTNER_STATUSES = Object.freeze({
  APPLICATION: "APPLICATION",
  VERIFICATION: "VERIFICATION",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED"
});
export function validatePartnerApplication(application) {
  const issues = [];
  if (!PARTNER_TYPES.includes(application?.type)) issues.push("Unsupported partner type");
  if (!application?.organizationName?.trim()) issues.push("Organization name required");
  if (!application?.officialWebsite?.startsWith("https://")) issues.push("Official HTTPS website required");
  if (!application?.officialEmail?.includes("@")) issues.push("Official organization email required");
  if (!application?.authorizedRepresentative) issues.push("Authorized representative required");
  if (!application?.privacyAcknowledged) issues.push("Privacy notice acknowledgement required");
  return { valid: issues.length === 0, issues };
}
export function partnerAccessAllowed(partner) {
  return partner?.status === PARTNER_STATUSES.APPROVED &&
    partner?.organizationVerified === true &&
    partner?.representativeVerified === true &&
    partner?.agreementAccepted === true &&
    partner?.role === "PARTNER_CASEWORKER";
}
export function canReferClaim(partner, consumer) {
  return partnerAccessAllowed(partner) &&
    consumer?.explicitReferralConsent === true &&
    consumer?.consentScope === "claim-referral";
}
