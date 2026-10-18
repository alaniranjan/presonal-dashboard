export type Difficulty = "beginner" | "intermediate" | "advanced";
export type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked";
export type QuestionStatus = "new" | "attempted" | "needs_improvement" | "strong" | "ready";

export interface Profile {
  id: string;
  full_name: string | null;
  target_role: string;
  experience_years: number | null;
  current_ctc: string | null;
  target_salary: string | null;
  location: string | null;
  notice_period: string | null;
  weekly_hours: number;
  daily_study_minutes: number;
  timezone: string;
  start_date: string | null;
  roadmap_generated: boolean;
  job_checklist: string[];
}

export interface WeekPlan {
  week: number;
  title: string;
  goal: string;
  criteria: string;
}

export interface Roadmap {
  id: string;
  month_number: number;
  title: string;
  level: string;
  goal: string | null;
  outcome: string | null;
  weeks: WeekPlan[];
}

export interface LearningTask {
  id: string;
  roadmap_id: string | null;
  week_number: number | null;
  title: string;
  description: string | null;
  category: string;
  difficulty: Difficulty;
  estimated_minutes: number;
  actual_minutes: number | null;
  planned_date: string | null;
  completed_at: string | null;
  status: TaskStatus;
  notes: string | null;
  resource_links: string[];
  completion_criteria: string | null;
  rating: number | null;
  confidence: number | null;
  related_question_id: string | null;
  is_custom: boolean;
}

export interface InterviewQuestion {
  id: string;
  category: string;
  topic: string;
  question: string;
  difficulty: Difficulty;
  expected_points: string[];
  hints: string[];
  model_answer: string | null;
  follow_ups: string[];
  status: QuestionStatus;
  bookmarked: boolean;
  attempt_count: number;
  last_score: number | null;
  last_confidence: number | null;
  first_attempted_at: string | null;
  last_attempted_at: string | null;
  is_sample: boolean;
}

export interface AnswerAttempt {
  id: string;
  question_id: string;
  answer: string;
  code_snippet: string | null;
  hints_used: number;
  revealed_answer: boolean;
  points_covered: string[];
  completeness_score: number | null;
  clarity_rating: number | null;
  correctness_rating: number | null;
  score: number | null;
  confidence: number | null;
  feedback: string | null;
  feedback_source: "self" | "ai";
  created_at: string;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type MilestoneStatus = "not_started" | "in_progress" | "completed" | "blocked";
export type ProjectStatus = "not_started" | "in_progress" | "completed" | "on_hold";

export interface Project {
  id: string;
  name: string;
  summary: string | null;
  requirements: string[];
  folder_structure: string | null;
  test_scenarios: string[];
  acceptance_criteria: string[];
  design_questions: string[];
  repo_url: string | null;
  status: ProjectStatus;
  is_sample: boolean;
  sort_order: number;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  due_date: string | null;
  status: MilestoneStatus;
  evidence_url: string | null;
  evidence_notes: string | null;
  completed_at: string | null;
}

export interface Resume {
  id: string;
  version_name: string;
  target_role: string | null;
  summary: string | null;
  skills: string[];
  experience_text: string | null;
  projects_text: string | null;
  achievements: string | null;
  content: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface JdComparison {
  id: string;
  resume_id: string | null;
  company: string | null;
  job_title: string | null;
  jd_text: string;
  matched_skills: string[];
  missing_skills: string[];
  match_score: number | null;
  suggestions: string[];
  notes: string | null;
  created_at: string;
}

export interface IntroScript {
  id: string;
  duration: "30s" | "60s" | "2min";
  script: string;
  self_rating: number | null;
  feedback: string | null;
  created_at: string;
}

export interface StarStory {
  id: string;
  title: string;
  prompt: string | null;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  tags: string[];
  self_rating: number | null;
  updated_at: string;
}

export type JobStatus =
  | "saved" | "to_apply" | "applied" | "recruiter_contacted" | "screening"
  | "technical_1" | "technical_2" | "hr" | "offer" | "rejected" | "on_hold";

export interface JobApplication {
  id: string;
  application_code: string | null;
  company: string;
  job_title: string;
  job_url: string | null;
  portal: string;
  location: string | null;
  work_mode: string | null;
  job_description: string | null;
  required_skills: string[];
  experience_required: string | null;
  salary_range: string | null;
  date_found: string | null;
  date_applied: string | null;
  resume_id: string | null;
  recruiter_name: string | null;
  recruiter_contact: string | null;
  referral_details: string | null;
  status: JobStatus;
  follow_up_date: string | null;
  recruiter_feedback: string | null;
  rejection_reason: string | null;
  offer_details: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewRound {
  id: string;
  application_id: string;
  round_type: string;
  scheduled_at: string | null;
  questions_asked: string | null;
  self_score: number | null;
  weak_topics: string[];
  feedback: string | null;
  outcome: string;
}

export interface MockInterview {
  id: string;
  title: string;
  interview_type: string;
  categories: string[];
  question_ids: string[];
  status: "in_progress" | "completed" | "abandoned";
  overall_score: number | null;
  feedback: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}
