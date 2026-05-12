/**
 * Exam TypeScript Types - Frontend
 */

export interface Exam {
  _id: string;
  exam_id: string;
  template_id: string;
  name: string;
  description?: string;
  class_id?: string | { _id: string } ;
  scheduled_date?: string;
  due_date?: string;
  answers: Array<{
    question_id: number;
    correct: string;
    points: number;
  }>;
  grading_policy: {
    partial_credit: boolean;
    penalty_incorrect: number;
    require_manual_review_on_ambiguity: boolean;
  };
  metadata?: {
    created_at?: string;
    created_by?: string;
    total_points?: number;
  };
  question_count: number;
  total_points: number;
  created_by: string;
  is_active: boolean;
  status: "draft" | "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface CreateExamRequest {
  exam_id?: string;
  template_id: string;
  name: string;
  description?: string;
  class_id?: string;
  scheduled_date?: string;
  due_date?: string;
  answers: Array<{
    question_id: number;
    correct: string;
    points?: number;
  }>;
  grading_policy?: {
    partial_credit?: boolean;
    penalty_incorrect?: number;
    require_manual_review_on_ambiguity?: boolean;
  };
}

export interface UpdateExamRequest {
  name?: string;
  description?: string;
  class_id?: string;
  scheduled_date?: string;
  due_date?: string;
  answers?: Array<{
    question_id: number;
    correct: string;
    points?: number;
  }>;
  grading_policy?: {
    partial_credit?: boolean;
    penalty_incorrect?: number;
    require_manual_review_on_ambiguity?: boolean;
  };
  status?: "draft" | "active" | "completed" | "archived";
  is_active?: boolean;
}

export interface ExamListResponse {
  exams: Exam[];
  total: number;
  page?: number;
  limit?: number;
  pages?: number;
}

export interface ExamStatistics {
  exam_id: string;
  total_scans: number;
  graded_scans: number;
  needs_review: number;
  average_score: number;
  average_percentage: number;
  highest_score: number;
  lowest_score: number;
  completion_rate: number;
}
