-- 2026 campaign operations: decisions, the season age rule, angel codes and drive settings.
-- Still SERVER-ONLY: RLS on, no policies, anon/authenticated revoked.
--
-- children.approved keeps its meaning: "published on the public tree".
-- children.decision is the organizer's separate decision. Only an approved decision can be published.

-- Over-age applicants (for example a 21-year-old) must be storable so they can be set aside with a reason.
alter table public.children drop constraint children_age_check;
alter table public.children add constraint children_age_check check (age is null or age between 0 and 120);

alter table public.children
  add column decision text not null default 'pending' check (decision in ('pending','approved','needs_info','declined','set_aside')),
  add column decision_reason text,
  add column set_aside_code text check (set_aside_code in ('over_age','other')),
  add column age_uncertain boolean not null default false,
  add column angel_code text unique,
  add column decided_at timestamptz,
  add column decided_by text;

alter table public.children add constraint children_published_needs_approval check (not approved or decision = 'approved');
create index children_decision_idx on public.children (decision);

-- Public label for each angel. Assigned when a child is first approved, never reused.
create sequence public.angel_code_seq;
create or replace function public.assign_angel_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.decision = 'approved' and new.angel_code is null then
    new.angel_code := 'G26-' || lpad(nextval('public.angel_code_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;
revoke all on function public.assign_angel_code() from public, anon, authenticated;
create trigger children_assign_angel_code
  before insert or update of decision on public.children
  for each row execute function public.assign_angel_code();

-- Season settings: max_age ({"value":17,"confirmed":true}) and label_stock ({"value":"avery5160"}).
create table public.drive_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.drive_settings enable row level security;
revoke all on public.drive_settings from public, anon, authenticated;
grant select, insert, update on public.drive_settings to service_role;
