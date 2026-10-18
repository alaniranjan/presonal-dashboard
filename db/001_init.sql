-- QA Career Command Center — schema (15 tables). Applied by `npm run db:setup`.
-- Every table has a user_id; in local mode that is always the single practice user.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_role text not null default 'QA Automation Engineer / SDET',
  experience_years numeric(4,1) check (experience_years >= 0 and experience_years <= 50),
  current_ctc text,
  target_salary text,
  location text,
  notice_period text,
  weekly_hours numeric(4,1) not null default 15 check (weekly_hours >= 0 and weekly_hours <= 100),
  daily_study_minutes int not null default 150 check (daily_study_minutes between 0 and 1440),
  timezone text not null default 'Asia/Kolkata',
  start_date date,
  roadmap_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Learning
-- ---------------------------------------------------------------------------
create table public.learning_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  month_number int not null check (month_number between 1 and 12),
  title text not null,
  level text not null,
  goal text,
  outcome text,
  weeks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_number)
);

create table public.learning_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  roadmap_id uuid references public.learning_roadmaps(id) on delete set null,
  week_number int check (week_number between 1 and 52),
  title text not null check (length(title) between 1 and 300),
  description text,
  category text not null,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  estimated_minutes int not null default 30 check (estimated_minutes between 0 and 1440),
  actual_minutes int check (actual_minutes between 0 and 1440),
  planned_date date,
  completed_at timestamptz,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','blocked')),
  notes text,
  resource_links text[] not null default '{}',
  completion_criteria text,
  rating int check (rating between 1 and 5),
  confidence int check (confidence between 1 and 5),
  related_question_id uuid,
  related_project_id uuid,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a task only counts as completed when the user marks it so, and then it must have a completion time
  constraint completed_has_timestamp check ((status = 'completed') = (completed_at is not null))
);
create index learning_tasks_user_date_idx on public.learning_tasks (user_id, planned_date);
create index learning_tasks_user_status_idx on public.learning_tasks (user_id, status);

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null,
  study_minutes int not null default 0 check (study_minutes between 0 and 1440),
  energy int check (energy between 1 and 5),
  wins text,
  blockers text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Interview practice
-- ---------------------------------------------------------------------------
create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null,
  topic text not null,
  question text not null check (length(question) between 1 and 4000),
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  expected_points text[] not null default '{}',
  hints text[] not null default '{}',
  model_answer text,
  follow_ups text[] not null default '{}',
  status text not null default 'new' check (status in ('new','attempted','needs_improvement','strong','ready')),
  bookmarked boolean not null default false,
  attempt_count int not null default 0,
  last_score int check (last_score between 0 and 100),
  last_confidence int check (last_confidence between 1 and 5),
  first_attempted_at timestamptz,
  last_attempted_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_questions_user_cat_idx on public.interview_questions (user_id, category);
create index interview_questions_user_status_idx on public.interview_questions (user_id, status);

alter table public.learning_tasks
  add constraint learning_tasks_question_fk foreign key (related_question_id)
  references public.interview_questions(id) on delete set null;

create table public.answer_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  answer text not null check (length(answer) between 1 and 20000),
  code_snippet text,
  hints_used int not null default 0,
  revealed_answer boolean not null default false,
  points_covered text[] not null default '{}',
  completeness_score int check (completeness_score between 0 and 100),
  clarity_rating int check (clarity_rating between 1 and 5),
  correctness_rating int check (correctness_rating between 1 and 5),
  score int check (score between 0 and 100),
  confidence int check (confidence between 1 and 5),
  feedback text,
  feedback_source text not null default 'self' check (feedback_source in ('self','ai')),
  created_at timestamptz not null default now()
);
create index answer_attempts_question_idx on public.answer_attempts (question_id, created_at desc);
create index answer_attempts_user_idx on public.answer_attempts (user_id, created_at desc);

create table public.revision_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  due_date date not null,
  reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- at most one open revision item per question
create unique index revision_queue_open_uniq on public.revision_queue (question_id) where completed_at is null;
create index revision_queue_user_due_idx on public.revision_queue (user_id, due_date) where completed_at is null;

create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  interview_type text not null default 'technical',
  categories text[] not null default '{}',
  question_ids uuid[] not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  overall_score int check (overall_score between 0 and 100),
  feedback text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  summary text,
  requirements text[] not null default '{}',
  folder_structure text,
  test_scenarios text[] not null default '{}',
  acceptance_criteria text[] not null default '{}',
  design_questions text[] not null default '{}',
  repo_url text,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','on_hold')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  due_date date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','blocked')),
  evidence_url text,
  evidence_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a milestone cannot be completed without evidence
  constraint milestone_completed_needs_evidence check (
    status <> 'completed' or coalesce(evidence_url, evidence_notes) is not null
  )
);
create index project_milestones_project_idx on public.project_milestones (project_id, sort_order);

alter table public.learning_tasks
  add constraint learning_tasks_project_fk foreign key (related_project_id)
  references public.projects(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Career: resumes, applications, interviews, job search
-- ---------------------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  version_name text not null,
  target_role text,
  summary text,
  skills text[] not null default '{}',
  content text,
  file_path text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  application_code text,
  company text not null,
  job_title text not null,
  job_url text,
  portal text not null default 'linkedin' check (portal in ('linkedin','naukri','indeed','referral','company_site','other')),
  location text,
  work_mode text check (work_mode in ('onsite','hybrid','remote')),
  job_description text,
  required_skills text[] not null default '{}',
  experience_required text,
  salary_range text,
  date_found date,
  date_applied date,
  resume_id uuid references public.resumes(id) on delete set null,
  recruiter_name text,
  recruiter_contact text,
  referral_details text,
  status text not null default 'saved' check (status in (
    'saved','to_apply','applied','recruiter_contacted','screening',
    'technical_1','technical_2','hr','offer','rejected','on_hold')),
  follow_up_date date,
  recruiter_feedback text,
  rejection_reason text,
  offer_details text,
  next_action text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_applications_user_status_idx on public.job_applications (user_id, status);
create index job_applications_user_follow_idx on public.job_applications (user_id, follow_up_date);
-- duplicate detection helpers (enforced softly in the app, these speed up lookups)
create index job_applications_dupe_idx on public.job_applications (user_id, lower(company), lower(job_title));
create index job_applications_url_idx on public.job_applications (user_id, job_url);

create table public.interview_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  round_type text not null check (round_type in ('screening','technical_1','technical_2','manager','hr','other')),
  scheduled_at timestamptz,
  questions_asked text,
  self_score int check (self_score between 0 and 100),
  weak_topics text[] not null default '{}',
  feedback text,
  outcome text not null default 'scheduled' check (outcome in ('scheduled','passed','failed','pending','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_rounds_user_sched_idx on public.interview_rounds (user_id, scheduled_at);

create table public.job_search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null,
  checklist jsonb not null default '{}'::jsonb,
  applications_submitted int not null default 0 check (applications_submitted >= 0),
  recruiter_messages int not null default 0 check (recruiter_messages >= 0),
  follow_ups_sent int not null default 0 check (follow_ups_sent >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_start date not null,
  wins text,
  challenges text,
  weak_topics text[] not null default '{}',
  next_week_focus text,
  self_rating int check (self_rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers + row-level security for every table
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','learning_roadmaps','learning_tasks','daily_logs','interview_questions',
    'revision_queue','mock_interviews','projects','project_milestones','resumes',
    'job_applications','interview_rounds','job_search_logs','weekly_reviews'
  ] loop
    execute format('create trigger %I_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;

  foreach t in array array[
    'learning_roadmaps','learning_tasks','daily_logs','interview_questions','answer_attempts',
    'revision_queue','mock_interviews','projects','project_milestones','resumes',
    'job_applications','interview_rounds','job_search_logs','weekly_reviews'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = (select auth.uid()))
                    with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
