-- Virtual Angel Tree. Run on a NEW Supabase project (not the OptiEatsAI one).
-- Every table is SERVER-ONLY: RLS on, no policies, anon/authenticated revoked.
-- All access goes through Next.js routes that check the caller and expose only allow-listed columns.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  phone text,
  phone_norm text,
  email text,
  email_norm text,
  story text,
  source_label text,
  created_at timestamptz not null default now()
);
create index families_phone_norm_idx on public.families (phone_norm);
create index families_email_norm_idx on public.families (email_norm);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  email_norm text not null unique,
  phone text,
  -- unguessable link that opens "My angels" without an account
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  no integer generated always as identity,
  family_id uuid not null references public.families(id) on delete cascade,
  full_name text not null,                 -- private: never sent to sponsors
  first_name text not null,
  age integer check (age between 0 and 21),
  gender text check (gender in ('Girl','Boy','Other')),
  tops text,
  bottoms text,
  shoes text,
  wants text[] not null default '{}',
  needs text[] not null default '{}',
  faves text[] not null default '{}',
  fav_color text,
  gift_store text,
  gift_amount integer check (gift_amount between 5 and 200),
  gift_card_status text not null default 'none' check (gift_card_status in ('none','pledged','received')),
  photo_path text,                         -- object in the private child-photos bucket
  photo_public boolean not null default false,  -- sponsors see the photo only when an organizer turns this on
  approved boolean not null default false, -- on the public tree only when true
  status text not null default 'available' check (status in ('available','claimed','purchased','returned','given')),
  sponsor_id uuid references public.sponsors(id) on delete set null,
  claimed_at timestamptz,
  returned_at timestamptz,
  organizer_notes text,
  created_at timestamptz not null default now()
);
create index children_family_idx on public.children (family_id);
create index children_status_idx on public.children (status);

alter table public.families enable row level security;
alter table public.sponsors enable row level security;
alter table public.children enable row level security;
revoke all on public.families, public.sponsors, public.children from public, anon, authenticated;

-- New Supabase projects do not grant Data API access to new tables by default.
grant select, insert, update on public.families, public.children to service_role;
grant select on public.sponsors to service_role;
grant usage on sequence public.children_no_seq to service_role;

-- Atomic first-come claim. Two sponsors tapping Adopt at once: exactly one wins.
create or replace function public.claim_child(
  p_child uuid, p_name text, p_email text, p_phone text, p_gift boolean, p_sponsor_token text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sponsor public.sponsors;
  v_rows integer;
begin
  insert into public.sponsors (name, email, email_norm, phone)
  values (trim(p_name), trim(p_email), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''))
  on conflict (email_norm) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, public.sponsors.phone)
    where public.sponsors.token = p_sponsor_token
  returning * into v_sponsor;
  if not found then
    raise exception 'sponsor_session_required';
  end if;

  update public.children
     set status = 'claimed',
         sponsor_id = v_sponsor.id,
         claimed_at = now(),
         gift_card_status = case when p_gift and gift_store is not null then 'pledged' else gift_card_status end
   where id = p_child and status = 'available' and approved;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'child_unavailable';
  end if;
  return v_sponsor.token;
end;
$$;
revoke all on function public.claim_child(uuid, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_child(uuid, text, text, text, boolean, text) to service_role;

-- Private bucket for child photos. Served only through /api/photo/[id], which checks photo_public.
insert into storage.buckets (id, name, public) values ('child-photos', 'child-photos', false)
on conflict (id) do nothing;
