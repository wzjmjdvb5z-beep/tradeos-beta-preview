-- Keep billing stages in the existing manager-only financial table.
alter table public.job_financials add column if not exists billing_stage text check (billing_stage in ('bill sent','bill paid'));
-- Preserve recorded timer activity and updates instead of cascading their deletion.
alter table public.job_timer_sessions drop constraint job_timer_sessions_job_id_fkey;
alter table public.job_timer_sessions add constraint job_timer_sessions_job_id_fkey foreign key(job_id) references public.jobs(id) on delete restrict;
alter table public.job_notes drop constraint job_notes_job_id_fkey;
alter table public.job_notes add constraint job_notes_job_id_fkey foreign key(job_id) references public.jobs(id) on delete restrict;
alter table public.job_note_files drop constraint job_note_files_job_id_fkey;
alter table public.job_note_files add constraint job_note_files_job_id_fkey foreign key(job_id) references public.jobs(id) on delete restrict;

create or replace function public.manage_job(target_company uuid,target_job uuid,job_action text,next_stage text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.company_members where company_id=target_company and user_id=auth.uid() and active and role in ('owner','admin','manager')) then
  raise exception 'Only owners and managers can change or delete jobs.' using errcode='42501';
 end if;
 perform 1 from public.jobs where id=target_job and company_id=target_company for update;
 if not found then raise exception 'Job not found or no longer available.'; end if;
 if job_action='delete' then
  delete from public.job_assignments where job_id=target_job and company_id=target_company;
  delete from public.jobs where id=target_job and company_id=target_company;
 elsif job_action='stage' then
  if next_stage is null or next_stage not in ('ready','in progress','complete','bill sent','bill paid') then raise exception 'Choose a valid job stage.'; end if;
  update public.jobs set status=case when next_stage in ('bill sent','bill paid') then 'complete' else next_stage end where id=target_job and company_id=target_company;
  insert into public.job_financials(job_id,company_id,billing_stage) values(target_job,target_company,case when next_stage in ('bill sent','bill paid') then next_stage end)
  on conflict(job_id) do update set billing_stage=excluded.billing_stage,updated_at=now();
 else raise exception 'Unknown job action.';
 end if;
 return target_job;
exception when foreign_key_violation then
 raise exception 'This job has invoices, recorded time, costs or updates. Keep it and mark it Complete instead.' using errcode='23503';
end;
$$;
revoke all on function public.manage_job(uuid,uuid,text,text) from public,anon;
grant execute on function public.manage_job(uuid,uuid,text,text) to authenticated;
