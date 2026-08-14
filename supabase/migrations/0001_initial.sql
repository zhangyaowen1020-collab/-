create extension if not exists pgcrypto;

create table jobs (
  id uuid primary key default gen_random_uuid(),
  job_date date not null unique,
  status text not null default 'DRAFT',
  next_group_number integer not null default 1 check (next_group_number >= 1),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  group_id text not null check (group_id ~ '^G[0-9]{2}$'),
  apply_mode text not null check (apply_mode in ('top', 'bottom', 'set')),
  status text not null default 'DRAFT',
  baseline_attempt integer not null default 0,
  expansion_attempt integer not null default 0,
  unique (job_id, group_id)
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  role text not null check (role in ('model', 'top', 'bottom')),
  original_name text not null,
  sha256 text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  object_key text not null unique,
  created_at timestamptz not null default now()
);

create table outputs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  phase text not null check (phase in ('baseline', 'final')),
  attempt integer not null check (attempt > 0),
  output_file text not null,
  object_key text not null unique,
  technical_status text not null check (technical_status in ('PASS', 'FAIL')),
  unique (group_id, phase, attempt, output_file)
);

create table reviews (
  output_id uuid primary key references outputs(id) on delete cascade,
  identity text not null check (identity in ('PASS', 'FAIL', 'N/A')),
  body_pose text not null check (body_pose in ('PASS', 'FAIL', 'N/A')),
  background text not null check (background in ('PASS', 'FAIL', 'N/A')),
  garment_structure text not null check (garment_structure in ('PASS', 'FAIL', 'N/A')),
  color_material text not null check (color_material in ('PASS', 'FAIL', 'N/A')),
  logo_print text not null check (logo_print in ('PASS', 'FAIL', 'N/A')),
  occlusion text not null check (occlusion in ('PASS', 'FAIL', 'N/A')),
  group_consistency text not null check (group_consistency in ('PASS', 'FAIL', 'N/A')),
  final_status text not null check (final_status in ('PASS', 'FAIL')),
  saved_at timestamptz not null default now()
);

create table job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('tryon-assets', 'tryon-assets', false)
on conflict (id) do update set public = false;

alter table jobs enable row level security;
alter table groups enable row level security;
alter table assets enable row level security;
alter table outputs enable row level security;
alter table reviews enable row level security;
alter table job_events enable row level security;
