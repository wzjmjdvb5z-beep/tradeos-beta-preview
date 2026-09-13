-- Employee access hardening. Applied via the Supabase migration API.
create or replace function private.can_view_pricing(target_company uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.company_members cm
    where cm.company_id=target_company and cm.user_id=auth.uid()
      and cm.active and cm.role in ('owner','admin','manager'));
$$;

alter policy "members read jobs" on public.jobs using (
  private.is_company_admin(company_id) or exists (
    select 1 from public.job_assignments ja join public.company_members cm on cm.id=ja.member_id
    where ja.job_id=jobs.id and ja.company_id=jobs.company_id
      and cm.user_id=auth.uid() and cm.active
  )
);
alter policy "members read company billing" on public.company_billing
  using (private.is_company_admin(company_id));

-- Keep the existing billing implementation and signature, tightening only its membership guard.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.get_company_billing(uuid)'::regprocedure) into definition;
  if position('and cm.active = true' in definition)=0 then
    raise exception 'Unexpected billing function; review before applying';
  end if;
  definition := replace(definition, 'and cm.active = true',
    'and cm.active = true and cm.role in (''owner'',''admin'',''manager'')');
  execute definition;
end;
$$;

-- Timesheet rows are visible to their worker, but cost snapshots are manager-only.
do $$
declare tbl text; cols text;
begin
  foreach tbl in array array['weekly_timesheets','timesheets'] loop
    execute format('revoke select on public.%I from authenticated, anon',tbl);
    execute format('revoke select(hourly_cost) on public.%I from authenticated, anon',tbl);
    select string_agg(quote_ident(column_name),', ' order by ordinal_position) into cols
      from information_schema.columns where table_schema='public' and table_name=tbl and column_name<>'hourly_cost';
    execute format('grant select(%s) on public.%I to authenticated',cols,tbl);
  end loop;
end;
$$;

create or replace function public.get_weekly_cost_snapshots(target_company uuid)
returns table(id uuid,hourly_cost numeric)
language sql stable security definer set search_path = '' as $$
  select w.id,w.hourly_cost from public.weekly_timesheets w
  where w.company_id=target_company and auth.uid() is not null
    and private.is_company_admin(target_company);
$$;
revoke all on function public.get_weekly_cost_snapshots(uuid) from public, anon;
grant execute on function public.get_weekly_cost_snapshots(uuid) to authenticated;
