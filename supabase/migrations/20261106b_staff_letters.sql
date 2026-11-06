-- Forderbar: staff access for the letters screen and manual dispatch (post / fax).
-- STATUS: DRAFT. NOT APPLIED. Run AFTER 20261106_real_case_mandate_and_demand.sql.

-- Staff may read real cases and mandates (needed to pick a case and see mandate state).
drop policy if exists cases_staff_select_real on public.cases;
create policy cases_staff_select_real on public.cases for select to authenticated
  using (public.forderbar_is_staff() and synthetic = false);

drop policy if exists mandates_staff_select on public.mandates;
create policy mandates_staff_select on public.mandates for select to authenticated
  using (public.forderbar_is_staff());

-- Staff cancels a letter that has not been sent.
create or replace function public.forderbar_staff_cancel_demand(p_letter_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.demand_letters;
begin
  if not public.forderbar_is_staff() then raise exception 'Staff only'; end if;
  select * into l from public.demand_letters where id = p_letter_id and status in ('PENDING_CUSTOMER_APPROVAL', 'CUSTOMER_APPROVED', 'RELEASED');
  if not found then raise exception 'Letter cannot be cancelled'; end if;
  update public.demand_letters set status = 'CANCELLED', failure_reason = p_reason where id = p_letter_id;
  perform public.forderbar_log_event(l.case_id, 'DEMAND_CANCELLED_BY_STAFF', jsonb_build_object('letter_id', p_letter_id, 'reason', p_reason));
end $$;

-- Post and fax are sent by hand (or by a provider later). Staff records that and the proof (e.g. tracking number).
create or replace function public.forderbar_staff_mark_demand_sent_manually(p_letter_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.demand_letters;
begin
  if not public.forderbar_is_staff() then raise exception 'Staff only'; end if;
  if not public.forderbar_real_cases_enabled() then raise exception 'Real cases are not enabled'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Proof note required (e.g. tracking number)'; end if;
  select * into l from public.demand_letters where id = p_letter_id and status = 'RELEASED' and channel in ('POST', 'FAX');
  if not found then raise exception 'Letter is not a released post/fax letter'; end if;
  if not exists (select 1 from public.mandates where id = l.mandate_id and status = 'ACTIVE') then raise exception 'Mandate not active'; end if;
  update public.demand_letters set status = 'SENT', sent_at = now(),
         delivery_proof = jsonb_build_object('manual', true, 'note', p_note, 'by', auth.uid())
   where id = p_letter_id;
  perform public.forderbar_log_event(l.case_id, 'DEMAND_SENT_MANUALLY', jsonb_build_object('letter_id', p_letter_id, 'note', p_note));
end $$;

revoke execute on function public.forderbar_staff_cancel_demand(uuid, text) from public, anon;
revoke execute on function public.forderbar_staff_mark_demand_sent_manually(uuid, text) from public, anon;
grant execute on function public.forderbar_staff_cancel_demand(uuid, text) to authenticated;
grant execute on function public.forderbar_staff_mark_demand_sent_manually(uuid, text) to authenticated;
