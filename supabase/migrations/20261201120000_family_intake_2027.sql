-- 2027 family intake: editable questionnaire, one application per household, organizer review.
-- SERVER-ONLY like every other table here: RLS on, no policies, anon/authenticated revoked.
-- Applications keep the question wording and answers exactly as submitted (jsonb snapshot).

create table public.intake_questionnaires (
  id text primary key,
  season text not null,
  status text not null check (status in ('draft','published','archived')),
  version integer not null,
  questions jsonb not null,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index intake_questionnaires_season_idx on public.intake_questionnaires (season, version);
create unique index intake_one_draft_per_season on public.intake_questionnaires (season) where status = 'draft';
create unique index intake_one_published_per_season on public.intake_questionnaires (season) where status = 'published';

create table public.intake_applications (
  id text primary key,
  season text not null,
  status text not null check (status in ('submitted','needs_info','approved','declined')),
  submitted_at timestamptz not null default now(),
  data jsonb not null  -- household answers, per-child answers, angel codes, public cards, review note
);
create index intake_applications_season_status_idx on public.intake_applications (season, status);

create table public.intake_counters (
  season text primary key,
  last integer not null default 0
);

alter table public.intake_questionnaires enable row level security;
alter table public.intake_applications enable row level security;
alter table public.intake_counters enable row level security;
revoke all on public.intake_questionnaires, public.intake_applications, public.intake_counters from public, anon, authenticated;
grant select, insert, update on public.intake_questionnaires, public.intake_applications to service_role;

-- Reserves n consecutive angel numbers atomically and returns the first one.
create or replace function public.intake_next_codes(p_season text, p_n integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last integer;
begin
  insert into public.intake_counters as c (season, last) values (p_season, p_n)
  on conflict (season) do update set last = c.last + p_n
  returning c.last into v_last;
  return v_last - p_n + 1;
end;
$$;
revoke all on function public.intake_next_codes(text, integer) from public, anon, authenticated;
grant execute on function public.intake_next_codes(text, integer) to service_role;
