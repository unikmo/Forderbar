# Real-case flow: mandate and demand letters (switched OFF)

Status: drafted, **not applied** to the live database, texts **not legally reviewed**.

## What exists
- `supabase/migrations/20261106_real_case_mandate_and_demand.sql` – tables, access rules and functions.
- `assets/real-cases.js` + a hidden section on `/kundenkonto/` – customer sees mandate text, accepts it, approves or rejects letters. Invisible while the flag is off.

## Flow
1. Case accepted by Forderbar (`cases.status = 'APPROVED'`, `synthetic = false`).
2. Customer reads the approved mandate text and accepts it in the account (time, text version, SHA-256 of the text, IP and browser are stored).
3. Staff drafts a letter from the approved template (`forderbar_staff_create_demand`, deadline at least 14 days out).
4. Customer reads the letter and approves it (or rejects it).
5. Staff releases it (`forderbar_staff_release_demand`).
6. A sending worker (service role) sends only `RELEASED` letters and calls `forderbar_mark_demand_sent` with delivery proof. **The worker is not built yet.**
7. Every step is written to `real_case_events` (append-only). A customer can revoke the mandate at any time; open letters are then cancelled.

## Guard rails
- `app_flags.real_cases_enabled` is `false`. All real-case functions refuse to run while it is off (revoking a mandate still works).
- Mandate and letter templates cannot be set `active` unless `legal_approved_at` is filled (database CHECK).
- The shipped template texts are marked ENTWURF and inactive.

## To go live (after the lawyer signs off)
1. Review and run the migration in the Supabase SQL editor.
2. Put the approved texts into `mandate_templates` / `letter_templates`, then set `active = true`, `legal_approved_at = now()`, `legal_approved_by = '<name>'`.
3. Build and test the sending worker and the payment flow.
4. Only then: `update public.app_flags set enabled = true where key = 'real_cases_enabled';`

## Still open
- Sending worker (email, fax, post, delivery proof), payment matching and payout, staff UI for drafting and releasing letters (the functions exist, the screen does not), partner API.
- Verify the case `status` values in use; the SQL assumes `'APPROVED'`.
