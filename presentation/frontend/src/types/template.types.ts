// Template types for frontend use
export interface Position {
  x: number;
  y: number;
}

export type RegistrationMarkType = "circle" | "square";

export interface RegistrationMark {
  id: string;
  position: Position;
  type: RegistrationMarkType;
  size?: number;
}

export interface CanonicalSize {
  width: number;
  height: number;
}

export interface BubbleConfig {
  radius: number;
  fill_threshold: number;
  ambiguous_threshold: number;
}

export interface Question {
  question_id: number;
  options: Record<string, Position>;
}

export interface TemplateMetadata {
  created_at?: string;
  author?: string;
  notes?: string;
}

export interface Template {
  template_id: string;
  name: string;
  version?: string;
  canonical_size: CanonicalSize;
  registration_marks: RegistrationMark[];
  bubble_config: BubbleConfig;
  questions: Question[];
  metadata?: TemplateMetadata;
}
