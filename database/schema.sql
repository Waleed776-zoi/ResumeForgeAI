-- ResumeForge AI — v1 schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists base_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  resume_json jsonb not null,
  original_file_url text,
  created_at timestamp with time zone default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  base_resume_id uuid references base_resumes(id),
  company text,
  role text,
  job_posting_text text,
  job_json jsonb,
  gap_analysis jsonb,           -- written by code (lib/gap-analysis.ts), not AI
  tailored_resume_json jsonb,
  cover_letter text,
  explainability jsonb,         -- also code-derived
  integrity_passed boolean default false,
  integrity_flagged_items jsonb default '[]'::jsonb,
  integrity_notes text default '',
  resume_pdf_url text,
  resume_docx_url text,
  created_at timestamp with time zone default now()
);

-- Row Level Security: each user can only see/modify their own rows.
alter table base_resumes enable row level security;
alter table applications enable row level security;

create policy "Users manage their own base resumes"
  on base_resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for uploaded resume files (create via Dashboard → Storage,
-- or run this if you prefer SQL):
-- insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
