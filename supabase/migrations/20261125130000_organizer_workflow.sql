-- Multi-card requests use the existing gift-card pledge and receipt state.
-- NULL preserves the original single-card data for records created before this migration.
alter table public.children add column if not exists gift_cards jsonb
  check (gift_cards is null or (jsonb_typeof(gift_cards) = 'array' and jsonb_array_length(gift_cards) <= 40));

-- Organizer-entered contacts remain independent of sponsor claim identities.
-- A contact may be recorded before they have adopted an angel, without generating a sign-in token.
create table if not exists public.sponsor_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  organization text not null default '',
  email text not null default '',
  phone text not null default '',
  links text[] not null default '{}',
  notes text not null default '',
  flyer_name text,
  flyer_type text check (flyer_type in ('application/pdf', 'image/jpeg', 'image/png')),
  flyer_data text check (length(flyer_data) <= 2796204),
  created_at timestamptz not null default now(),
  check ((flyer_name is null and flyer_type is null and flyer_data is null) or
         (flyer_name is not null and flyer_type is not null and flyer_data is not null))
);
alter table public.sponsor_contacts enable row level security;
revoke all on public.sponsor_contacts from public, anon, authenticated;
grant select, insert, update on public.sponsor_contacts to service_role;
