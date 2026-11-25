-- Additive 2026 gift ledger. Existing child requests and sponsorships remain unchanged.
-- The existing child lists remain the source of the requested items; the trigger maintains a stable per-item ledger.
create table public.gift_items (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  item_key text not null,
  kind text not null check (kind in ('need','want','gift_card')),
  label text not null check (length(label) > 0),
  amount integer check (amount is null or amount between 5 and 200),
  position integer not null,
  active boolean not null default true,
  purchase_source text check (purchase_source in ('sponsor','organizer','donation')),
  received boolean not null default false,
  donation_assigned boolean not null default false,
  unique (child_id,item_key)
);
alter table public.gift_items enable row level security;
revoke all on public.gift_items from public, anon, authenticated;
grant select, insert, update on public.gift_items to service_role;
create index gift_items_child_active_idx on public.gift_items(child_id, active, position);

create or replace function public.sync_child_gift_items(p_child public.children)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  -- Remove from the active request set, but retain the history and any receipt.
  update public.gift_items set active=false where child_id=p_child.id and active;
  insert into public.gift_items(child_id,item_key,kind,label,amount,position,active)
  select p_child.id, jsonb_build_array(kind,label,amount,occurrence)::text, kind,label,amount,position,true
  from (
    select kind,label,amount,position,row_number() over(partition by kind,label,amount order by position) as occurrence
    from (
      select 'need'::text as kind,btrim(x.val) as label,null::integer as amount,x.ord::integer as position
      from unnest(p_child.needs) with ordinality as x(val,ord)
      union all
      select 'want',btrim(x.val),null::integer,100000+x.ord::integer from unnest(p_child.wants) with ordinality as x(val,ord)
      union all
      select 'gift_card',btrim(g.val->>'store'),(g.val->>'amount')::integer,200000+g.ord::integer
      from jsonb_array_elements(coalesce(p_child.gift_cards,case when p_child.gift_store is not null and p_child.gift_amount is not null then jsonb_build_array(jsonb_build_object('store',p_child.gift_store,'amount',p_child.gift_amount)) else '[]'::jsonb end)) with ordinality as g(val,ord)
    ) raw where label <> ''
  ) numbered
  on conflict(child_id,item_key) do update set active=true,position=excluded.position;
end; $$;
revoke all on function public.sync_child_gift_items(public.children) from public,anon,authenticated;
grant execute on function public.sync_child_gift_items(public.children) to service_role;

create or replace function public.on_child_gifts_changed()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='INSERT' then
    perform public.sync_child_gift_items(new);
  else
    if old.sponsor_id is distinct from new.sponsor_id and old.sponsor_id is not null then
      -- The replacement sponsor must not inherit unreceived purchases attributed to the former sponsor.
      update public.gift_items set purchase_source=null where child_id=new.id and purchase_source='sponsor' and not received;
    end if;
    if old.wants is distinct from new.wants or old.needs is distinct from new.needs or old.gift_cards is distinct from new.gift_cards or old.gift_store is distinct from new.gift_store or old.gift_amount is distinct from new.gift_amount then
      perform public.sync_child_gift_items(new);
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.on_child_gifts_changed() from public,anon,authenticated;
grant execute on function public.on_child_gifts_changed() to service_role;
create trigger child_gift_ledger after insert or update on public.children for each row execute function public.on_child_gifts_changed();

-- Backfill actual requests only. Never infer purchases or receipts from the old whole-child status.
do $$ declare c public.children; begin for c in select * from public.children loop perform public.sync_child_gift_items(c); end loop; end $$;

-- Lock the child before a sponsor's update, serializing against release/reassignment and list edits.
create or replace function public.set_sponsor_gift(p_token text,p_item uuid,p_purchased boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare cid uuid; n integer;
begin
  select c.id into cid from public.children c join public.gift_items g on g.child_id=c.id join public.sponsors s on s.id=c.sponsor_id
    where g.id=p_item and g.active and s.token=p_token and c.status in ('claimed','purchased') for update of c;
  if not found then return false; end if;
  update public.gift_items set purchase_source=case when p_purchased then 'sponsor' else null end
    where id=p_item and child_id=cid and active and not received and not donation_assigned and (purchase_source is null or purchase_source='sponsor');
  get diagnostics n=row_count;
  return n=1;
end; $$;
revoke all on function public.set_sponsor_gift(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_sponsor_gift(text,uuid,boolean) to service_role;

create or replace function public.release_sponsor_angel(p_token text,p_child uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare cid uuid;
begin
  select c.id into cid from public.children c join public.sponsors s on s.id=c.sponsor_id
    where c.id=p_child and s.token=p_token and c.status in ('claimed','purchased') for update of c;
  if not found or exists(select 1 from public.gift_items where child_id=p_child and received) then return false; end if;
  update public.children set status='available', sponsor_id=null, claimed_at=null, gift_card_status=case when gift_card_status='pledged' then 'none' else gift_card_status end where id=cid;
  return true;
end; $$;
revoke all on function public.release_sponsor_angel(text,uuid) from public,anon,authenticated;
grant execute on function public.release_sponsor_angel(text,uuid) to service_role;

-- Serialize organizer receipt edits with sponsor release and list changes.
create or replace function public.edit_admin_gift(p_item uuid,p_action text,p_source text,p_value boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare cid uuid; n integer;
begin
  select c.id into cid from public.children c join public.gift_items g on g.child_id=c.id where g.id=p_item and g.active for update of c;
  if not found then return false; end if;
  if p_action='purchase' then
    update public.gift_items set purchase_source=p_source where id=p_item and child_id=cid and active;
  elsif p_action='received' then
    update public.gift_items set received=p_value where id=p_item and child_id=cid and active;
  elsif p_action='donation' then
    update public.gift_items set donation_assigned=p_value where id=p_item and child_id=cid and active;
  else return false;
  end if;
  get diagnostics n=row_count;
  return n=1;
end; $$;
revoke all on function public.edit_admin_gift(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.edit_admin_gift(uuid,text,text,boolean) to service_role;

-- Donation intentions (never evidence of payment); organizer manually reconciles verified receipts.
create table public.donation_offers (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('store_gift_card','additional_angel_gifts','party_expenses','other')),
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) between 3 and 200),
  amount_cents integer check (amount_cents between 1 and 100000000),
  method text check (method in ('PayPal','Zelle','Cash App','In person','Other')),
  details text not null default '' check (length(details)<=1000),
  status text not null default 'pending' check (status in ('pending','received','contacted','closed')),
  received_cents integer check (received_cents between 1 and 100000000),
  organizer_notes text not null default '' check (length(organizer_notes)<=1000),
  created_at timestamptz not null default now(),
  check (purpose <> 'other' or (amount_cents is null and received_cents is null)),
  check (status='received' or received_cents is null)
);
alter table public.donation_offers enable row level security;
revoke all on public.donation_offers from public,anon,authenticated;
grant select,insert,update on public.donation_offers to service_role;
create index donation_offers_status_idx on public.donation_offers(status,created_at);
