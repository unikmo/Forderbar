# Forderbar — Case intake, communication and collection architecture

Status: **implementation specification, not connected to production APIs**. The current website is a static, client-side demo. No actual customer registration, documents, mail/fax delivery, account monitoring, collection case or partner API is live.

## User journeys

### A. Consumer has not yet requested payment
1. Create an account (planned: verified email, consent, privacy notice, secure storage).
2. Submit claim category, company, amount, contract and evidence; upload supporting files.
3. Pre-screen **before any outbound message**: claimant identity and standing, claim type and basis, due date, evidence, counterparty identity, company solvency indicators, likely objections, limitation, estimated full recovery probability, lawful fee eligibility and expected contribution margin.
4. Decision: accept; request missing evidence; qualified manual review; decline with clear explanation. An 80% recovery rate is a **pilot target**, not a guaranteed prediction or legal rejection threshold.
5. For accepted cases, obtain separately documented collection agreement/authority and consumer approval for the initial private demand. Legal review of the exact timing, contract and right of withdrawal is required.
6. Draft a short consumer-sent request with correct amount, recipient, basis and suitable payment deadline. Choose verified email, fax, or postal provider. Store message, approvals, send status and relevant access evidence.
7. Track deadline, replies and direct-to-consumer payments. Never infer non-payment from silence alone.
8. If claim is still open and default is actually established, and no new objections or legal blockers have arisen, trigger professional collection **without an arbitrary additional waiting period**. If contested or uncertain, pause for qualified review.
9. Reconcile principal, legally recoverable fees, client payout and closeout.

### B. Consumer already sent a payment demand
1. Upload the original demand, proof of recipient/access, dates, any company responses and payment evidence.
2. Check maturity and whether default arose under applicable German law (including exceptions where a reminder is unnecessary).
3. If the claim passes full screening and default is confirmed, move directly to the professional Inkasso stage after valid authorization; **do not automatically wait another 14 days**.
4. If access/default cannot be established, obtain evidence or send an appropriate demand.

## Core state machine

DRAFT -> PRE_SCREENING -> NEEDS_EVIDENCE | HUMAN_REVIEW | DECLINED | APPROVED -> MANDATED -> DEMAND_APPROVAL -> DEMAND_SENT -> MONITORING -> PAID | DISPUTED | DEFAULT_CONFIRMED -> COLLECTION_ACTIVE -> PAID | PARTIALLY_PAID | DISPUTED | UNCOLLECTIBLE -> SETTLED | CLOSED.

Existing-demand cases may skip DEMAND_SENT and MONITORING if evidence and default conditions justify it. Do not use a simple day-15 timer as the legal trigger.

## Integrations: not yet connected

- Email: transactional sending provider, inbound mailbox/webhooks and scoped optional consumer mailbox authorization; avoid blanket mailbox access.
- Fax: evaluate simple-fax.de provider terms, API availability, pricing, retention and delivery evidence; **no API credentials or confirmed integration yet**.
- Postal: print-and-mail service with delivery evidence when needed.
- Payment monitoring: direct consumer payment; explicit confirmation or appropriately licensed/open-banking integration with granular consent; never require broad bank credentials.
- Verbraucherzentralen / Mieterschutzvereine: optional partner/referral portal, **no verified API or partnership**. No affiliation, endorsement or partner branding until contractually authorized.
- Legal operations: RDG registration, qualified supervision, professional liability insurance, lawful fees, collection disclosures, consumer withdrawal rights and data protection before real case activation.

## Security and QA gates

Authentication, server-side authorization and case isolation; encrypted files; retention and deletion; consent audit trail; rate limiting; abuse/fraud checks; human review for disputed cases; delivery evidence; deduplicated webhooks; payment reconciliation; logs without unnecessary personal data; automated tests for disputed claims, early payment, partial payment, unknown access, invalid default, insolvency and consent withdrawal.

## Design and communication

Brand: **Forderbar**, cream, forest green, orange (no red). Main hook near logo: 0 € up to 100 €, 10% above on success, subject to legal validation. Plain German, empathetic, no misleading claims of recovery, endorsements or testimonials. Clearly label the current static prototype.
