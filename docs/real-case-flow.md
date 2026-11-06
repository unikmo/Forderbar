# Real-case flow: mandate and demand letters (switched OFF)

Status: drafted, **not applied** to the live database, texts **not legally reviewed**.

## What exists
- `supabase/migrations/20261106_real_case_mandate_and_demand.sql` – tables, access rules and functions.
- `supabase/migrations/20261106b_staff_letters.sql` – staff read access, cancel and manual-send functions (run second).
- `api/send-demands.js` – sending worker (Vercel function). Tested with mocked network in `tests/send-demands.test.mjs`.
- `/admin/briefe/` – staff screen: draft, release, cancel, record manual post/fax dispatch, trigger email sending.
- `assets/real-cases.js` + a hidden section on `/kundenkonto/` – customer sees mandate text, accepts it, approves or rejects letters. Invisible while the flag is off.

## Flow
1. Case accepted by Forderbar (`cases.status = 'APPROVED'`, `synthetic = false`).
2. Customer reads the approved mandate text and accepts it in the account (time, text version, SHA-256 of the text, IP and browser are stored).
3. Staff drafts a letter from the approved template (`forderbar_staff_create_demand`, deadline at least 14 days out). Two stages:
   - **Stage 1, `INITIAL_DEMAND`:** written in the customer's name, signed by the customer. Forderbar is not named in the text or the email sender. Payment target must not be a Forderbar-named account.
   - **Stage 2, `INKASSO_DEMAND`:** Forderbar appears openly as Inkassodienstleister. Only possible after a stage-1 letter was sent and its deadline passed, or with a documented earlier demand by the customer.
4. Customer reads the letter and approves it (or rejects it).
5. Staff releases it (`forderbar_staff_release_demand`).
6. The sending worker (`api/send-demands.js`, email via Resend) sends only `RELEASED` email letters and records proof via `forderbar_mark_demand_sent`. Post and fax letters are sent by hand; staff record the proof in the staff screen.
7. Every step is written to `real_case_events` (append-only). A customer can revoke the mandate at any time; open letters are then cancelled.

## Guard rails
- `app_flags.real_cases_enabled` is `false`. All real-case functions refuse to run while it is off (revoking a mandate still works).
- Mandate and letter templates cannot be set `active` unless `legal_approved_at` is filled (database CHECK).
- The shipped template texts are marked ENTWURF and inactive.

## To go live (after the lawyer signs off)
1. Review and run the migration in the Supabase SQL editor.
2. Put the approved texts into `mandate_templates` / `letter_templates`, then set `active = true`, `legal_approved_at = now()`, `legal_approved_by = '<name>'`.
3. Set Vercel env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM_NEUTRAL` + `MAIL_REPLY_TO_NEUTRAL` (stage 1: an address on a neutral, non-Forderbar domain you control and verify in Resend, replies land in a mailbox Forderbar monitors), `MAIL_FROM_FORDERBAR` + optional `MAIL_REPLY_TO` (stage 2: an address on forderbar.de), optional `CRON_SECRET`, and finally `REAL_CASES_SEND_ENABLED=true` (second kill switch, independent of the database flag). Never put the service-role key in the repo.
4. Build and test the payment flow.
5. Only then: `update public.app_flags set enabled = true where key = 'real_cases_enabled';`

## Still open
- Payment matching and payout, partner API.
- Post and fax have no provider yet: a person sends them and records the proof. A provider adapter can be added to `api/send-demands.js` later.
- No automatic schedule: email is sent when staff press the button (or an external scheduler calls the endpoint with `CRON_SECRET`). Vercel cron was left out on purpose.
- Verify the case `status` values in use; the SQL assumes `APPROVED`.
- Nothing here has been run against the real database or a real mail provider.
