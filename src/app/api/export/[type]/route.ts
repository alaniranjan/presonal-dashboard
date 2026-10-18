import { csvResponse, toCsv } from "@/lib/csv";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Col = readonly [key: string, label: string];

const EXPORTS: Record<string, { sql: string; columns: readonly Col[] }> = {
  applications: {
    sql: `select a.*, r.version_name as resume_version,
            (select string_agg(ir.round_type || coalesce(' ' || to_char(ir.scheduled_at, 'YYYY-MM-DD'), '') || ' (' || ir.outcome || ')', '; '
                               order by ir.scheduled_at) from interview_rounds ir where ir.application_id = a.id) as rounds,
            (select string_agg(ir.questions_asked, ' | ') from interview_rounds ir where ir.application_id = a.id) as questions_asked
          from job_applications a left join resumes r on r.id = a.resume_id order by a.created_at`,
    columns: [
      ["application_code", "Application ID"], ["date_found", "Date Found"], ["company", "Company"], ["job_title", "Job Title"],
      ["portal", "Portal"], ["job_url", "Job URL"], ["location", "Location"], ["work_mode", "Work Mode"],
      ["experience_required", "Experience Required"], ["required_skills", "Required Skills"], ["salary_range", "Salary Range"],
      ["resume_version", "Resume Version"], ["date_applied", "Date Applied"], ["recruiter_name", "Recruiter"],
      ["recruiter_contact", "Recruiter Contact"], ["referral_details", "Referral"], ["status", "Application Status"],
      ["follow_up_date", "Next Follow-up"], ["rounds", "Interview Rounds"], ["questions_asked", "Questions Asked"],
      ["recruiter_feedback", "Feedback"], ["rejection_reason", "Rejection Reason"], ["offer_details", "Offer Details"],
      ["next_action", "Next Action"], ["notes", "Notes"],
    ],
  },
  tasks: {
    sql: `select week_number, planned_date, title, category, difficulty, status, estimated_minutes, actual_minutes,
            completed_at, rating, confidence, notes from learning_tasks order by planned_date nulls last, created_at`,
    columns: [
      ["week_number", "Week"], ["planned_date", "Planned date"], ["title", "Task"], ["category", "Category"], ["difficulty", "Difficulty"],
      ["status", "Status"], ["estimated_minutes", "Estimated min"], ["actual_minutes", "Actual min"], ["completed_at", "Completed at"],
      ["rating", "Rating"], ["confidence", "Confidence"], ["notes", "Notes"],
    ],
  },
  attempts: {
    sql: `select a.created_at, q.category, q.topic, q.question, a.score, a.completeness_score, a.correctness_rating, a.clarity_rating,
            a.confidence, a.hints_used, a.revealed_answer, a.answer, a.feedback
          from answer_attempts a join interview_questions q on q.id = a.question_id order by a.created_at`,
    columns: [
      ["created_at", "Attempted at"], ["category", "Section"], ["topic", "Topic"], ["question", "Question"], ["score", "Score"],
      ["completeness_score", "Points covered %"], ["correctness_rating", "Correctness"], ["clarity_rating", "Clarity"],
      ["confidence", "Confidence"], ["hints_used", "Hints used"], ["revealed_answer", "Answer viewed first"],
      ["answer", "Answer"], ["feedback", "Feedback"],
    ],
  },
};

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const spec = EXPORTS[type];
  if (!spec) return new Response("Unknown export type", { status: 404 });
  const rows = await query(spec.sql);
  const body = toCsv(rows, spec.columns.map(([key, label]) => ({ key, label })));
  return csvResponse(body, `${type}-${new Date().toISOString().slice(0, 10)}.csv`);
}
