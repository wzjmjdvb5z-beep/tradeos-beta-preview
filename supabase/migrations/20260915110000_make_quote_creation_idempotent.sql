alter table public.quotes
  add column if not exists client_request_id uuid;

create unique index if not exists quotes_company_client_request_id_key
  on public.quotes (company_id, client_request_id)
  where client_request_id is not null;

create or replace function public.create_trade_quote_v3(
  target_company uuid,
  selected_customer uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  quote_title text,
  quote_description text,
  quote_items jsonb,
  discount_percent numeric,
  quote_valid_until date,
  request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  existing_quote_id uuid;
  new_quote_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_company_admin(target_company) then
    raise exception 'Manager permission required';
  end if;

  if request_id is null then
    return public.create_trade_quote_v3(
      target_company,
      selected_customer,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      quote_title,
      quote_description,
      quote_items,
      discount_percent,
      quote_valid_until
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_company::text || ':' || request_id::text, 0)
  );

  select q.id
  into existing_quote_id
  from public.quotes q
  where q.company_id = target_company
    and q.client_request_id = request_id;

  if existing_quote_id is not null then
    return existing_quote_id;
  end if;

  new_quote_id := public.create_trade_quote_v3(
    target_company,
    selected_customer,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    quote_title,
    quote_description,
    quote_items,
    discount_percent,
    quote_valid_until
  );

  update public.quotes q
  set client_request_id = request_id
  where q.id = new_quote_id
    and q.company_id = target_company;

  return new_quote_id;
end;
$$;

revoke all on function public.create_trade_quote_v3(uuid,uuid,text,text,text,text,text,text,jsonb,numeric,date,uuid) from public;
revoke all on function public.create_trade_quote_v3(uuid,uuid,text,text,text,text,text,text,jsonb,numeric,date,uuid) from anon;
grant execute on function public.create_trade_quote_v3(uuid,uuid,text,text,text,text,text,text,jsonb,numeric,date,uuid) to authenticated;
