-- Veystead launch pricing: 14-day trial, £19 base including one owner,
-- then £7.99 for every additional active member.
alter table public.company_billing
  add column if not exists seat_price_pence integer not null default 799
    check (seat_price_pence >= 0);

alter table public.company_billing drop constraint if exists company_billing_plan_check;
alter table public.company_billing add constraint company_billing_plan_check
  check (plan in ('founding_beta','veystead_core'));

update public.company_billing
set plan = 'veystead_core', price_pence = 1900, seat_price_pence = 799
where stripe_subscription_id is null;

drop function if exists public.get_company_billing_v2(uuid);
create function public.get_company_billing_v2(target_company uuid)
returns table(
  company_id uuid,
  plan text,
  status text,
  price_pence integer,
  seat_price_pence integer,
  active_user_count integer,
  additional_user_count integer,
  monthly_total_pence integer,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  days_remaining integer,
  has_subscription boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company
      and cm.user_id = auth.uid()
      and cm.active
      and cm.role in ('owner','admin','manager')
  ) then
    raise exception 'Not authorised';
  end if;

  return query
  with seats as (
    select count(distinct cm.user_id)::integer as active_users
    from public.company_members cm
    where cm.company_id = target_company and cm.active
  )
  select b.company_id,
         b.plan,
         b.status,
         b.price_pence,
         b.seat_price_pence,
         greatest(1, s.active_users),
         greatest(0, s.active_users - 1),
         b.price_pence + greatest(0, s.active_users - 1) * b.seat_price_pence,
         b.trial_started_at,
         b.trial_ends_at,
         b.current_period_end,
         b.cancel_at_period_end,
         greatest(0, ceil(extract(epoch from (b.trial_ends_at - now())) / 86400.0)::integer),
         b.stripe_subscription_id is not null
  from public.company_billing b cross join seats s
  where b.company_id = target_company;
end;
$$;

revoke all on function public.get_company_billing_v2(uuid) from public, anon;
grant execute on function public.get_company_billing_v2(uuid) to authenticated;
