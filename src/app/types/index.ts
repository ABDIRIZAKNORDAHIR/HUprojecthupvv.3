export type Role = "student" | "teacher" | "admin";

export type ViewId =
  | "dashboard"
  | "ai-queue"
  | "submissions"
  | "students"
  | "analytics"
  | "atlas"
  | "settings"
  | "team"
  | "feedback"
  | "scores"
  | "teacher-chat"
  | "messages"
  | "achievements"
  | "batch-scanner"
  | "system-health"
  | "users"
  | "ai-settings"
  | "export-center"
  | "class-assignments";

export type SubmissionStatus = "pending" | "approved" | "rejected" | "changes_requested";

export interface HistoricalMatch {
  project_title: string;
  student_name: string;
  year: number;
  similarity: number;
  preview: string;
}

export interface ActiveCollision {
  student_name: string;
  similarity: number;
  project_title?: string;
}

export interface RealAIBriefing {
  hasRealAI: boolean;
  whatProjectIsAbout?: string;
  recommendedDecision?: 'approve' | 'reject' | 'request_changes';
  decisionConfidence?: number;
  decisionReasoning?: string;
  decisionLabel?: string;
  whatShouldContain?: string[];
  featureSuggestions?: string[];
  strengths?: string[];
  provider?: string;
  model?: string;
  analyzedAt?: string;
}

export interface AthenaVerdict {
  uniqueness_score: number;
  ai_confidence: number;
  historical_matches: HistoricalMatch[];
  active_collisions: ActiveCollision[];
  ai_suggestion: string;
  suggested_differentiators: string[];
  rejection_reasons: string[];
  realAI?: RealAIBriefing;
}

export interface Submission {
  id: string;
  student_id?: number | null;
  student_name: string;
  student_avatar: string;
  student_photo?: string | null;
  university_id?: string;
  department_name?: string;
  class_name?: string;
  study_mode?: string;
  department: string;
  project_title: string;
  abstract: string;
  submission_date: string;
  status: SubmissionStatus;
  /** Raw workflow stage from the API (pending_teacher, assigned, submitted, …). */
  stage?: string;
  /** ISO time the project reached the teacher, used to order the review queue. */
  arrived_at?: string;
  athena: AthenaVerdict;
}

export interface CollisionAlert {
  id: string;
  students: { name: string; avatar: string; project: string; abstract: string }[];
  similarity: number;
  common_keywords: string[];
  ai_resolution: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: "submit" | "revise" | "flag" | "approve" | "reject";
  action?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: "ai" | "submission" | "collision" | "batch";
}

export interface ApprovedProject {
  id: string;
  title: string;
  student: string;
  department: string;
  status: "approved" | "pending" | "rejected" | "in_progress";
  approved_by?: string;
  approved_date?: string;
}

export interface Presentation {
  id: string;
  project: string;
  student: string;
  date: string;
  time: string;
  room: string;
}

export interface FeedbackItem {
  id: string;
  student: string;
  project: string;
  text: string;
  time: string;
}

export function getConfidenceLevel(score: number): "High" | "Medium" | "Low" {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

export function getScoreColor(score: number): string {
  if (score > 80) return "#16A34A";
  if (score >= 50) return "#EAB308";
  return "#EF4444";
}
