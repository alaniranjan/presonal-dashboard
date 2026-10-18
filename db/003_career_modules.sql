-- Phase 5–7 additions: resume lab, mock interview answers, job-search checklist.

-- Configurable daily job-search checklist (Settings → Job search routine).
alter table public.profiles add column job_checklist text[] not null default array[
  'Review new relevant jobs',
  'Check LinkedIn',
  'Check Naukri',
  'Check Indeed',
  'Review company career pages',
  'Update the application tracker',
  'Customize resume for relevant vacancies',
  'Send recruiter messages',
  'Follow up on due applications',
  'Record recruiter calls and interview feedback'
];

-- Answers given inside a mock interview are normal attempts, linked to the mock.
alter table public.answer_attempts
  add column mock_interview_id uuid references public.mock_interviews(id) on delete set null;
create index answer_attempts_mock_idx on public.answer_attempts (mock_interview_id);

alter table public.mock_interviews add column duration_seconds int check (duration_seconds >= 0);

-- Resume Lab -----------------------------------------------------------------
create table public.intro_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  duration text not null check (duration in ('30s', '60s', '2min')),
  script text not null check (length(script) between 1 and 10000),
  self_rating int check (self_rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index intro_scripts_duration_idx on public.intro_scripts (user_id, duration, created_at desc);

create table public.star_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (length(title) between 1 and 200),
  prompt text,
  situation text,
  task text,
  action text,
  result text,
  tags text[] not null default '{}',
  self_rating int check (self_rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jd_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  resume_id uuid references public.resumes(id) on delete set null,
  application_id uuid references public.job_applications(id) on delete set null,
  company text,
  job_title text,
  jd_text text not null check (length(jd_text) between 1 and 50000),
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  match_score int check (match_score between 0 and 100),
  suggestions text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.resumes add column projects_text text;
alter table public.resumes add column experience_text text;
alter table public.resumes add column achievements text;

alter table public.projects add column sort_order int not null default 0;

do $$
declare t text;
begin
  foreach t in array array['intro_scripts', 'star_stories'] loop
    execute format('create trigger %I_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['intro_scripts', 'star_stories', 'jd_comparisons'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
