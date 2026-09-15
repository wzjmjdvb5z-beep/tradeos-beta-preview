-- Permanent duplicate/error job removal and explicit employee financial controls.
create or replace function private.can_view_pricing(target_company uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.company_members cm
    where cm.company_id=target_company and cm.user_id=auth.uid() and cm.active
      and (cm.role in ('owner','admin','manager') or cm.can_view_pricing)
  );
$$;

create or replace function public.set_member_pricing_access(target_company uuid,target_member uuid,allowed boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.is_company_owner_or_admin(target_company) then
    raise exception 'Only owners and admins can change pricing access.' using errcode='42501';
  end if;
  update public.company_members set can_view_pricing=coalesce(allowed,false)
   where id=target_member and company_id=target_company and active and role='employee';
  if not found then raise exception 'Active employee not found.'; end if;
end;
$$;
revoke all on function public.set_member_pricing_access(uuid,uuid,boolean) from public,anon;
grant execute on function public.set_member_pricing_access(uuid,uuid,boolean) to authenticated;

create or replace function public.manage_job(target_company uuid,target_job uuid,job_action text,next_stage text default null)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(
    select 1 from public.company_members where company_id=target_company and user_id=auth.uid()
      and active and role in ('owner','admin','manager')
  ) then raise exception 'Only owners and managers can change or delete jobs.' using errcode='42501'; end if;
  perform 1 from public.jobs where id=target_job and company_id=target_company for update;
  if not found then raise exception 'Job not found or no longer available.'; end if;
  if job_action='delete' then
    delete from public.payments where company_id=target_company and invoice_id in
      (select id from public.invoices where company_id=target_company and job_id=target_job);
    delete from public.invoices where company_id=target_company and job_id=target_job;
    delete from public.weekly_time_entries where company_id=target_company and job_id=target_job;
    delete from public.timesheets where company_id=target_company and job_id=target_job;
    delete from public.job_timer_sessions where company_id=target_company and job_id=target_job;
    delete from public.job_note_files where company_id=target_company and job_id=target_job;
    delete from public.job_notes where company_id=target_company and job_id=target_job;
    delete from public.job_materials where company_id=target_company and job_id=target_job;
    delete from public.expenses where company_id=target_company and job_id=target_job;
    delete from public.job_assignments where company_id=target_company and job_id=target_job;
    delete from public.jobs where id=target_job and company_id=target_company;
  elsif job_action='stage' then
    if next_stage is null or next_stage not in ('ready','in progress','complete','bill sent','bill paid') then raise exception 'Choose a valid job stage.'; end if;
    update public.jobs set status=case when next_stage in ('bill sent','bill paid') then 'complete' else next_stage end where id=target_job and company_id=target_company;
    insert into public.job_financials(job_id,company_id,billing_stage)
    values(target_job,target_company,case when next_stage in ('bill sent','bill paid') then next_stage end)
    on conflict(job_id) do update set billing_stage=excluded.billing_stage,updated_at=now();
  else raise exception 'Unknown job action.'; end if;
  return target_job;
end;
$$;
revoke all on function public.manage_job(uuid,uuid,text,text) from public,anon;
grant execute on function public.manage_job(uuid,uuid,text,text) to authenticated;
