create or replace function public.delete_quote(target_company uuid, target_quote uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null or not private.is_company_admin(target_company) then
    raise exception 'Only owners and managers can delete quotes.' using errcode = '42501';
  end if;

  perform 1
  from public.quotes
  where id = target_quote and company_id = target_company
  for update;

  if not found then
    raise exception 'Quote not found or no longer available.';
  end if;

  update public.jobs
  set quote_id = null
  where company_id = target_company and quote_id = target_quote;

  delete from public.quotes
  where id = target_quote and company_id = target_company;

  return target_quote;
end;
$$;

revoke all on function public.delete_quote(uuid, uuid) from public;
revoke all on function public.delete_quote(uuid, uuid) from anon;
grant execute on function public.delete_quote(uuid, uuid) to authenticated;
