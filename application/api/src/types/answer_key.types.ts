/**
 * Answer key schema types for TypeScript
 * Maps to domain/schemas/answer_key.schema.json
 */

export interface Answer {
  question_id: number;
  correct: string; // Single letter A-Z
  points?: number; // Default: 1
}

export interface GradingPolicy {
  partial_credit?: boolean; // Default: false
  penalty_incorrect?: number; // Default: 0
  require_manual_review_on_ambiguity?: boolean; // Default: true
}

export interface AnswerKeyMetadata {
  created_at?: string; // ISO 8601 datetime
  created_by?: string; // User ID
  total_points?: number;
}

export interface AnswerKey {
  exam_id: string;
  template_id: string;
  name?: string;
  answers: Answer[];
  grading_policy?: GradingPolicy;
  metadata?: AnswerKeyMetadata;
}
