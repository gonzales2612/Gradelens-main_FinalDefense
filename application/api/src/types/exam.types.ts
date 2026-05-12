/**
 * Exam/Exam TypeScript Types
 * Enhanced type definitions for Exam/Exam entity
 */

import type { AnswerKey } from "./answer_key.types.ts";

export interface Exam {
  _id: string;
  exam_id: string;               // Unique exam identifier
  template_id: string;           // Form template to use
  name: string;
  description?: string;
  
  // Class assignment
  class_id?: string;             // Class ObjectId
  
  // Scheduling
  scheduled_date?: string;       // ISO date string
  due_date?: string;             // ISO date string
  
  // Answer key
  answers: Array<{
    question_id: number;
    correct: string;             // e.g., "A", "B", "C", "D"
    points: number;
  }>;
  
  // Grading policy
  grading_policy: {
    partial_credit: boolean;
    penalty_incorrect: number;
    require_manual_review_on_ambiguity: boolean;
  };
  
  // Metadata
  metadata?: {
    created_at?: string;
    created_by?: string;
    total_points?: number;
  };
  
  // Denormalized fields
  question_count: number;
  total_points: number;
  
  // Status
  created_by: string;
  is_active: boolean;
  status: "draft" | "active" | "completed" | "archived";
  
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
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
}

export interface ExamWithClass extends Exam {
  class?: {
    _id: string;
    class_id: string;
    name: string;
    student_count: number;
  };
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
  completion_rate: number;      // Percentage of students who submitted
}
