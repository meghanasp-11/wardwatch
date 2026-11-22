-- Run once in the Supabase SQL editor.
create table if not exists patients (
  id text primary key default ('p-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null,
  age int not null check (age between 0 and 120),
  bed_number text not null,
  condition text not null,
  spo2_scale int not null default 1 check (spo2_scale in (1, 2)),
  meds_and_labs text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists vitals_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references patients(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  resp_rate int not null,
  spo2 int not null,
  on_oxygen boolean not null default false,
  systolic_bp int not null,
  heart_rate int not null,
  temp numeric(3,1) not null,
  consciousness text not null check (consciousness in ('A','C','V','P','U')),
  news2_total int not null,
  risk_level text not null check (risk_level in ('Low','Medium','High')),
  single_red boolean not null,
  qsofa_score int not null,
  sepsis_alert boolean not null,
  spo2_scale_used int not null,
  breakdown jsonb not null,
  source text not null default 'manual'
);
create index if not exists vitals_patient_time on vitals_logs (patient_id, recorded_at desc);

-- Only the server (service-role key) touches these tables. RLS on with no policies
-- blocks the public anon key entirely, so the browser can never read patient data directly.
alter table patients enable row level security;
alter table vitals_logs enable row level security;
