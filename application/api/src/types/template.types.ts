/**
 * Template schema types for TypeScript
 * Maps to domain/schemas/template.schema.json
 */

export interface Position {
  x: number;
  y: number;
}

export type RegistrationMarkType = "circle" | "square";

export interface RegistrationMark {
  id: string;
  position: Position;
  type: RegistrationMarkType;
  size?: number; // Default: 20
}

export interface CanonicalSize {
  width: number;
  height: number;
}

export interface BubbleConfig {
  radius: number;
  fill_threshold: number; // Default: 0.30
  ambiguous_threshold: number; // Default: 0.65
}

export interface Question {
  question_id: number;
  options: Record<string, Position>; // e.g., { "A": {x: 300, y: 400}, ... }
}

export interface TemplateMetadata {
  created_at?: string; // ISO 8601 datetime
  author?: string;
  notes?: string;
}

export interface Template {
  template_id: string;
  name: string;
  version?: string; // Default: "1.0.0"
  canonical_size: CanonicalSize;
  registration_marks: RegistrationMark[];
  bubble_config: BubbleConfig;
  questions: Question[];
  metadata?: TemplateMetadata;
}
