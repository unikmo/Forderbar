-- Forderbar: real-case mandate and demand-letter flow
-- STATUS: DRAFT. NOT APPLIED. Review (and have counsel review the texts) before running in Supabase.
--
-- Safety design:
--   * Everything real is gated by app_flags.real_cases_enabled (default FALSE).
--   * Mandate and letter texts cannot be activated unless legal_approved_at is set (CHECK constraint).
--   * New tables have row level security; browsers only get narrow SELECT policies, all writes go through
--     SECURITY DEFINER functions that check ownership, flag, mandate and approval state.
--   * Every state change is written to the append-only table real_case_events.
--   * Nothing in this file sends anything. Sending is done by a separate worker that uses the
--     service_role key and calls forderbar_mark_demand_sent() after a letter reached status RELEASED.
--
-- Assumes existing: public.cases(id, user_id, amount_cents, description, status, synthetic, ...),
--                   public.mandates(id, case_id, document_version, status, created_at),
--                   public.admin_members_preview(user_id), public.staff_members(user_id).
-- Real cases are cases with synthetic = false. Case status 'APPROVED' means accepted by Forderbar.

------------------------------------------------------------------ flag and helpers
create table if not exists public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.app_flags enable row level security;
insert into public.app_flags(key, enabled) values ('real_cases_enabled', false) on conflict (key) do nothing;

create or replace function public.forderbar_real_cases_enabled()
returns boolean language sql stable security definer set search_path = public, pg_temp as
$$ select coalesce((select enabled from public.app_flags where key = 'real_cases_enabled'), false) $$;

create or replace function public.forderbar_is_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as
$$ select exists (select 1 from public.admin_members_preview where user_id = auth.uid())
       or exists (select 1 from public.staff_members where user_id = auth.uid()) $$;

------------------------------------------------------------------ audit log (append only)
create table if not exists public.real_case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases(id),
  actor uuid,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.real_case_events enable row level security;

create or replace function public.forderbar_log_event(p_case uuid, p_action text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public, pg_temp as
$$ insert into public.real_case_events(case_id, actor, action, detail) values (p_case, auth.uid(), p_action, coalesce(p_detail, '{}'::jsonb)) $$;

------------------------------------------------------------------ mandate texts
create table if not exists public.mandate_templates (
  version text primary key,
  title text not null,
  body text not null,
  active boolean not null default false,
  legal_approved_at timestamptz,
  legal_approved_by text,
  created_at timestamptz not null default now(),
  constraint mandate_active_needs_legal_approval check (not active or legal_approved_at is not null)
);
alter table public.mandate_templates enable row level security;

insert into public.mandate_templates(version, title, body) values ('mandate-v1-DRAFT', 'Auftrag zur Forderungsdurchsetzung (ENTWURF)',
$t$ENTWURF – NICHT RECHTLICH GEPRÜFT. Darf erst nach Freigabe durch einen Rechtsanwalt aktiviert werden.

Auftrag zur außergerichtlichen Durchsetzung einer Geldforderung

1. Auftrag. Ich beauftrage Forderbar, die in meinem Fall genannte Geldforderung gegenüber der dort bezeichneten Gegenpartei außergerichtlich geltend zu machen, die Korrespondenz mit der Gegenpartei zu führen und Zahlungseingänge zu überwachen.
2. Vollmacht. Forderbar darf zu diesem Zweck in meinem Namen Zahlungsaufforderungen und Mitteilungen an die Gegenpartei richten und Zahlungen entgegennehmen. Gerichtliche Schritte und Vergleiche über die Forderung erfolgen nur mit meiner gesonderten Zustimmung.
3. Freigabe. Jedes Schreiben an die Gegenpartei wird mir vorab angezeigt und erst nach meiner Freigabe versendet.
4. Vergütung. Es gilt die Vergütung nach den AGB (Erfolgsprovision, keine Provision ohne Erfolg).
5. Zahlungsfluss. Zahlungen der Gegenpartei gehen an ein von Forderbar benanntes Konto. Forderbar leitet mir den Betrag abzüglich der vereinbarten Provision weiter.
6. Meine Angaben. Ich versichere, dass meine Angaben und Unterlagen vollständig und wahr sind und dass die Forderung mir zusteht.
7. Widerruf und Kündigung. Ich kann diesen Auftrag jederzeit in Textform oder im Kundenkonto beenden. Das gesetzliche Widerrufsrecht bleibt unberührt.
8. Datenschutz. Es gilt die Datenschutzerklärung von Forderbar.$t$)
on conflict (version) do nothing;

alter table public.mandates
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists document_text text,
  add column if not exists document_sha256 text,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_ip text,
  add column if not exists accepted_user_agent text,
  add column if not exists revoked_at timestamptz;
create unique index if not exists mandates_one_active_per_case on public.mandates(case_id) where status = 'ACTIVE';

drop policy if exists mandates_owner_select on public.mandates;
create policy mandates_owner_select on public.mandates for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.mandates from anon, authenticated;

create or replace function public.forderbar_get_mandate_template()
returns table (version text, title text, body text)
language sql stable security definer set search_path = public, pg_temp as
$$ select mt.version, mt.title, mt.body from public.mandate_templates mt
    where mt.active and mt.legal_approved_at is not null order by mt.created_at desc limit 1 $$;

create or replace function public.forderbar_accept_mandate(p_case_id uuid, p_version text, p_confirmed boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.mandate_templates; c public.cases; hdr json; m uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.forderbar_real_cases_enabled() then raise exception 'Real cases are not enabled'; end if;
  if p_confirmed is not true then raise exception 'Explicit confirmation required'; end if;
  select * into c from public.cases where id = p_case_id and user_id = auth.uid() and synthetic = false;
  if not found then raise exception 'Case not found'; end if;
  if c.status <> 'APPROVED' then raise exception 'Case has not been accepted by Forderbar'; end if;
  select * into t from public.mandate_templates where version = p_version and active and legal_approved_at is not null;
  if not found then raise exception 'Mandate text not available'; end if;
  if exists (select 1 from public.mandates where case_id = p_case_id and status = 'ACTIVE') then raise exception 'Mandate already active'; end if;
  begin hdr := current_setting('request.headers', true)::json; exception when others then hdr := null; end;
  insert into public.mandates(case_id, document_version, status, user_id, document_text, document_sha256, accepted_at, accepted_ip, accepted_user_agent)
  values (p_case_id, t.version, 'ACTIVE', auth.uid(), t.body, encode(sha256(convert_to(t.body, 'UTF8')), 'hex'), now(),
          nullif(split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', 1), ''), hdr->>'user-agent')
  returning id into m;
  perform public.forderbar_log_event(p_case_id, 'MANDATE_ACCEPTED', jsonb_build_object('mandate_id', m, 'version', t.version));
  return m;
end $$;

-- Revocation is allowed even when the flag is off.
create or replace function public.forderbar_revoke_mandate(p_case_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.mandates set status = 'REVOKED', revoked_at = now()
   where case_id = p_case_id and user_id = auth.uid() and status = 'ACTIVE';
  if not found then raise exception 'No active mandate'; end if;
  update public.demand_letters set status = 'CANCELLED'
   where case_id = p_case_id and status in ('PENDING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED', 'RELEASED');
  perform public.forderbar_log_event(p_case_id, 'MANDATE_REVOKED', '{}'::jsonb);
end $$;

------------------------------------------------------------------ demand letters
create table if not exists public.letter_templates (
  kind text primary key check (kind in ('INITIAL_DEMAND', 'REMINDER')),
  subject text not null,
  body text not null,
  active boolean not null default false,
  legal_approved_at timestamptz,
  legal_approved_by text,
  created_at timestamptz not null default now(),
  constraint letter_active_needs_legal_approval check (not active or legal_approved_at is not null)
);
alter table public.letter_templates enable row level security;

insert into public.letter_templates(kind, subject, body) values ('INITIAL_DEMAND', 'Zahlungsaufforderung, Aktenzeichen {{aktenzeichen}} (ENTWURF)',
$t$ENTWURF – NICHT RECHTLICH GEPRÜFT.

Sehr geehrte Damen und Herren,

wir handeln im Auftrag und mit Vollmacht von {{kunde}}. Unserem Mandanten steht gegen {{gegenpartei}} eine Forderung in Höhe von {{betrag}} zu.

Sachverhalt: {{beschreibung}}

Wir fordern Sie auf, den Betrag bis zum {{frist}} auf folgendes Konto zu zahlen:
{{zahlung}}

Bitte nennen Sie bei der Zahlung das Aktenzeichen {{aktenzeichen}}. Sollten Sie die Forderung bestreiten, teilen Sie uns dies bitte mit Begründung vor Fristablauf mit.

Mit freundlichen Grüßen
Forderbar$t$)
on conflict (kind) do nothing;

create table if not exists public.demand_letters (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  mandate_id uuid not null references public.mandates(id),
  kind text not null check (kind in ('INITIAL_DEMAND', 'REMINDER')),
  channel text not null check (channel in ('EMAIL', 'POST', 'FAX')),
  recipient_name text not null,
  recipient_address text,
  recipient_email text,
  subject text not null,
  body text not null,
  deadline date,
  status text not null default 'PENDING_CUSTOMER_APPROVAL'
    check (status in ('PENDING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED', 'RELEASED', 'SENT', 'FAILED', 'CANCELLED')),
  created_by uuid,
  created_at timestamptz not null default now(),
  customer_approved_at timestamptz,
  customer_approved_by uuid,
  staff_released_at timestamptz,
  staff_released_by uuid,
  sent_at timestamptz,
  delivery_proof jsonb,
  failure_reason text,
  constraint demand_email_needs_email check (channel <> 'EMAIL' or recipient_email is not null),
  constraint demand_post_needs_address check (channel <> 'POST' or recipient_address is not null)
);
alter table public.demand_letters enable row level security;
revoke all on public.demand_letters from anon, authenticated;
grant select on public.demand_letters to authenticated;

drop policy if exists demand_letters_owner_select on public.demand_letters;
create policy demand_letters_owner_select on public.demand_letters for select to authenticated
  using (exists (select 1 from public.cases c where c.id = demand_letters.case_id and c.user_id = auth.uid()));
drop policy if exists demand_letters_staff_select on public.demand_letters;
create policy demand_letters_staff_select on public.demand_letters for select to authenticated
  using (public.forderbar_is_staff());

-- Staff drafts a letter from the approved template. The customer must approve it before anything is released.
create or replace function public.forderbar_staff_create_demand(
  p_case_id uuid, p_kind text, p_channel text, p_recipient_name text, p_recipient_address text,
  p_recipient_email text, p_customer_name text, p_deadline date, p_payment_details text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.cases; m public.mandates; t public.letter_templates; b text; s text; amount text; l uuid;
begin
  if not public.forderbar_is_staff() then raise exception 'Staff only'; end if;
  if not public.forderbar_real_cases_enabled() then raise exception 'Real cases are not enabled'; end if;
  select * into c from public.cases where id = p_case_id and synthetic = false;
  if not found then raise exception 'Case not found'; end if;
  select * into m from public.mandates where case_id = p_case_id and status = 'ACTIVE';
  if not found then raise exception 'No active mandate'; end if;
  select * into t from public.letter_templates where kind = p_kind and active and legal_approved_at is not null;
  if not found then raise exception 'Letter template not approved'; end if;
  if p_deadline is null or p_deadline < current_date + 14 then raise exception 'Deadline must be at least 14 days ahead'; end if;
  if coalesce(trim(p_payment_details), '') = '' or coalesce(trim(p_customer_name), '') = '' then raise exception 'Customer name and payment details required'; end if;
  amount := replace(to_char((c.amount_cents - c.paid_cents) / 100.0, 'FM9999999990.00'), '.', ',') || ' €';
  b := t.body; s := t.subject;
  b := replace(b, '{{kunde}}', p_customer_name);
  b := replace(b, '{{gegenpartei}}', p_recipient_name);
  b := replace(b, '{{betrag}}', amount);
  b := replace(b, '{{beschreibung}}', c.description);
  b := replace(b, '{{frist}}', to_char(p_deadline, 'DD.MM.YYYY'));
  b := replace(b, '{{zahlung}}', p_payment_details);
  b := replace(b, '{{aktenzeichen}}', upper(left(c.id::text, 8)));
  s := replace(s, '{{aktenzeichen}}', upper(left(c.id::text, 8)));
  insert into public.demand_letters(case_id, mandate_id, kind, channel, recipient_name, recipient_address, recipient_email, subject, body, deadline, created_by)
  values (p_case_id, m.id, p_kind, p_channel, p_recipient_name, p_recipient_address, p_recipient_email, s, b, p_deadline, auth.uid())
  returning id into l;
  perform public.forderbar_log_event(p_case_id, 'DEMAND_DRAFTED', jsonb_build_object('letter_id', l, 'kind', p_kind, 'channel', p_channel));
  return l;
end $$;

create or replace function public.forderbar_customer_approve_demand(p_letter_id uuid, p_confirmed boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.demand_letters;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not public.forderbar_real_cases_enabled() then raise exception 'Real cases are not enabled'; end if;
  if p_confirmed is not true then raise exception 'Explicit confirmation required'; end if;
  select dl.* into l from public.demand_letters dl join public.cases c on c.id = dl.case_id
   where dl.id = p_letter_id and c.user_id = auth.uid() and dl.status = 'PENDING_CUSTOMER_APPROVAL';
  if not found then raise exception 'Letter not found or not awaiting approval'; end if;
  if not exists (select 1 from public.mandates where id = l.mandate_id and status = 'ACTIVE') then raise exception 'Mandate not active'; end if;
  update public.demand_letters set status = 'CUSTOMER_APPROVED', customer_approved_at = now(), customer_approved_by = auth.uid() where id = p_letter_id;
  perform public.forderbar_log_event(l.case_id, 'DEMAND_CUSTOMER_APPROVED', jsonb_build_object('letter_id', p_letter_id));
end $$;

create or replace function public.forderbar_customer_reject_demand(p_letter_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.demand_letters;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select dl.* into l from public.demand_letters dl join public.cases c on c.id = dl.case_id
   where dl.id = p_letter_id and c.user_id = auth.uid() and dl.status in ('PENDING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED');
  if not found then raise exception 'Letter not found'; end if;
  update public.demand_letters set status = 'CANCELLED' where id = p_letter_id;
  perform public.forderbar_log_event(l.case_id, 'DEMAND_CUSTOMER_REJECTED', jsonb_build_object('letter_id', p_letter_id));
end $$;

-- Second pair of eyes: staff releases a letter the customer approved. Only RELEASED letters may be sent by the worker.
create or replace function public.forderbar_staff_release_demand(p_letter_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.demand_letters;
begin
  if not public.forderbar_is_staff() then raise exception 'Staff only'; end if;
  if not public.forderbar_real_cases_enabled() then raise exception 'Real cases are not enabled'; end if;
  select * into l from public.demand_letters where id = p_letter_id and status = 'CUSTOMER_APPROVED';
  if not found then raise exception 'Letter is not customer-approved'; end if;
  if not exists (select 1 from public.mandates where id = l.mandate_id and status = 'ACTIVE') then raise exception 'Mandate not active'; end if;
  update public.demand_letters set status = 'RELEASED', staff_released_at = now(), staff_released_by = auth.uid() where id = p_letter_id;
  perform public.forderbar_log_event(l.case_id, 'DEMAND_RELEASED', jsonb_build_object('letter_id', p_letter_id));
end $$;

-- Called only by the sending worker (service_role). Records delivery proof or failure.
create or replace function public.forderbar_mark_demand_sent(p_letter_id uuid, p_success boolean, p_proof jsonb, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.demand_letters;
begin
  if not public.forderbar_real_cases_enabled() then raise exception 'Real cases are not enabled'; end if;
  select * into l from public.demand_letters where id = p_letter_id and status = 'RELEASED';
  if not found then raise exception 'Letter is not released'; end if;
  if not exists (select 1 from public.mandates where id = l.mandate_id and status = 'ACTIVE') then raise exception 'Mandate not active'; end if;
  update public.demand_letters
     set status = case when p_success then 'SENT' else 'FAILED' end,
         sent_at = case when p_success then now() end,
         delivery_proof = p_proof, failure_reason = p_reason
   where id = p_letter_id;
  perform public.forderbar_log_event(l.case_id, case when p_success then 'DEMAND_SENT' else 'DEMAND_FAILED' end,
                                     jsonb_build_object('letter_id', p_letter_id, 'reason', p_reason));
end $$;

------------------------------------------------------------------ privileges
revoke all on public.app_flags, public.real_case_events, public.mandate_templates, public.letter_templates from anon, authenticated;

revoke execute on function public.forderbar_log_event(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.forderbar_mark_demand_sent(uuid, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.forderbar_mark_demand_sent(uuid, boolean, jsonb, text) to service_role;

revoke execute on function public.forderbar_real_cases_enabled() from public, anon;
revoke execute on function public.forderbar_is_staff() from public, anon;
revoke execute on function public.forderbar_get_mandate_template() from public, anon;
revoke execute on function public.forderbar_accept_mandate(uuid, text, boolean) from public, anon;
revoke execute on function public.forderbar_revoke_mandate(uuid) from public, anon;
revoke execute on function public.forderbar_staff_create_demand(uuid, text, text, text, text, text, text, date, text) from public, anon;
revoke execute on function public.forderbar_customer_approve_demand(uuid, boolean) from public, anon;
revoke execute on function public.forderbar_customer_reject_demand(uuid) from public, anon;
revoke execute on function public.forderbar_staff_release_demand(uuid) from public, anon;

grant execute on function public.forderbar_real_cases_enabled() to authenticated;
grant execute on function public.forderbar_is_staff() to authenticated;
grant execute on function public.forderbar_get_mandate_template() to authenticated;
grant execute on function public.forderbar_accept_mandate(uuid, text, boolean) to authenticated;
grant execute on function public.forderbar_revoke_mandate(uuid) to authenticated;
grant execute on function public.forderbar_staff_create_demand(uuid, text, text, text, text, text, text, date, text) to authenticated;
grant execute on function public.forderbar_customer_approve_demand(uuid, boolean) to authenticated;
grant execute on function public.forderbar_customer_reject_demand(uuid) to authenticated;
grant execute on function public.forderbar_staff_release_demand(uuid) to authenticated;
