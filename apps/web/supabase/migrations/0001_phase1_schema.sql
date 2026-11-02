-- =============================================================================
-- Phase 1 schema — Dashboard + Auth + Data (IMPLEMENTATION_PLAN section 4.1)
-- Apply in the Supabase SQL editor (DOCUMENTATION/supabase-setup.md runbook).
--
-- Notes:
-- - gen_random_uuid() is core PostgreSQL since v13; Supabase projects are v15+,
--   so no extension is required.
-- - `auth.users` is the Supabase managed auth schema; FKs cascade so deleting a
--   user removes all of their rows (right to erasure).
-- - warning_lists is read by SERVER code with the service role only; reports
--   aggregates are also computed server-side (no public policies).
-- =============================================================================

-- jobs captured by users -------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_platform text not null,           -- 'jobstreet' | 'indeed' | 'manual'
  source_url text,
  title text,
  company_name text,
  location text,
  work_type text,
  salary_text text,
  description text not null,
  contact_text text,                       -- emails, phones, chat handles found in post
  content_hash text not null,              -- sha256 of normalized description + title + company
  captured_at timestamptz not null default now()
);
create index jobs_user_idx on jobs(user_id, captured_at desc);
create index jobs_hash_idx on jobs(content_hash);

-- application status per job ---------------------------------------------------
create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'saved',    -- saved|applied|interviewing|offer|rejected
  applied_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);
create index applications_job_idx on applications(job_id);

-- scam check results (one or more per job; populated from Phase 2 onwards) ------
create table scam_checks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  risk_level text not null,                -- low_signals|caution|high_risk
  confidence text not null,
  rules_fired jsonb not null default '[]',
  tool_results jsonb not null default '{}',
  result jsonb,                            -- validated model output (null until finished)
  status text not null default 'pending',  -- pending|running|done|failed
  attempts int not null default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  used_ai boolean not null default false,
  model text,
  created_at timestamptz not null default now()
);
create index scam_checks_job_idx on scam_checks(job_id, created_at desc);
create index scam_checks_user_idx on scam_checks(user_id);

-- user reports (internal use) ---------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  kind text not null,                      -- 'scam' | 'false_alarm'
  company_key text,                        -- normalized company name
  domain_key text,                         -- normalized domain
  contact_key text,                        -- normalized email/handle
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, job_id, kind)
);

-- loaded official lists (service-role writes/read only) --------------------------
create table warning_lists (
  id uuid primary key default gen_random_uuid(),
  list_name text not null,
  source_url text not null,
  entry_key text not null,                 -- normalized name
  entry_raw text not null,
  updated_at timestamptz not null default now()
);
create index warning_lists_key_idx on warning_lists(entry_key);

-- keep applications.updated_at current on every edit -----------------------------
create or replace function applications_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_updated_at
  before update on applications
  for each row execute function applications_touch_updated_at();

-- Row Level Security ----------------------------------------------------------
alter table jobs enable row level security;
alter table applications enable row level security;
alter table scam_checks enable row level security;
alter table reports enable row level security;
-- warning_lists stays WITHOUT user-facing policies (service role bypasses RLS).
alter table warning_lists enable row level security;

create policy "own jobs" on jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own applications" on applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own checks" on scam_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reports" on reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
