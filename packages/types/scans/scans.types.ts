export type ScanStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "detected"
  | "graded"
  | "needs_review"
  | "reviewed"
  | "outdated"
  | "failed"
  | "error";

export type DetectionStatus = "answered" | "unanswered" | "ambiguous" | "error";

export type DetectionResultStatus = "success" | "failed" | "needs_review";

export type GradingResultStatus = "graded" | "needs_review" | "failed";

export type ReviewReason = "ambiguous" | "unanswered" | "low_confidence" | "multiple_marks";

export interface QuestionDetection {
  question_id: number;
  fill_ratios: Record<string, number>; // e.g., { "A": 0.05, "B": 0.82, ... }
  selected: string[]; // Empty if unanswered, multiple if ambiguous
  detection_status: DetectionStatus;
  confidence?: number; // 0.0 - 1.0
  manually_edited?: boolean; // True if manually edited by user
}

export interface QualityMetrics {
  blur_score?: number;
  brightness_mean?: number; // 0-255
  brightness_std?: number;
  skew_angle?: number;
  perspective_correction_applied?: boolean;
}

export interface DetectionWarning {
  code: string; // e.g., "LOW_BLUR_SCORE"
  message: string;
  question_id?: number;
}

export interface DetectionError {
  code: string; // e.g., "PAPER_NOT_DETECTED"
  message: string;
  stage?: string;
}

export interface PipelineImages {
  original?: string;
  grayscale?: string;
  clahe?: string;
  binary?: string;
  paper_detection?: string;
  perspective_corrected?: string;
  aligned?: string;
  roi_extraction?: string;
  fill_scoring?: string;
}

export interface DetectionResult {
  scan_id: string;
  template_id: string;
  status: DetectionResultStatus;
  detections: QuestionDetection[];
  quality_metrics?: QualityMetrics;
  warnings: DetectionWarning[];
  errors: DetectionError[];
  processing_time_ms?: number;
  timestamp?: string;
  pipeline_images?: PipelineImages;
}

export interface ScoreSummary {
  points_earned: number;
  points_possible: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  ambiguous_count: number;
}

export interface QuestionGrade {
  question_id: number;
  detected: string[]; // What CV detected
  correct_answer: string; // From answer key
  is_correct: boolean | null; // null if unanswered/ambiguous
  points_earned: number;
  points_possible: number;
  requires_review?: boolean;
  review_reason?: ReviewReason;
}

export interface GradingResult {
  scan_id: string;
  exam_id: string;
  status: GradingResultStatus;
  grades: QuestionGrade[];
  score: ScoreSummary;
  needs_manual_review: boolean;
  graded_at?: string;
  graded_by?: string;
}

export interface ScanLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

export interface Scan {
  _id?: string;
  scan_id: string;
  
  // File information
  filename: string;
  file_size?: number;
  mime_type?: string;
  
  // References
  template_id?: string;
  exam_id?: string;
  student_id?: string;
  class_id?: string;
  
  // Status tracking
  status: ScanStatus;
  
  // Results
  detection_result?: DetectionResult | null;
  grading_result?: GradingResult | null;
  
  // Error tracking
  error_message?: string;
  error_code?: string;
  
  // Processing metrics
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_time_ms?: number;
  
  // Manual review
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  
  // Manual grading edits
  graded_by?: string;
  graded_at?: string;
  
  // Audit trail
  logs?: ScanLog[];
  
  // Metadata
  uploaded_by?: string;
  metadata?: unknown;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  
  // Virtual
  overall_confidence?: number;
}

export interface UploadScanRequest {
  image: string; // base64
  exam_id: string;      // Exam/Exam ID
  student_id: string;   // Student ID
  redo_existing?: boolean; // Whether to update existing scan or mark as outdated
}

export interface UploadScanResponse {
  scan_id: string;
  status: string;
  exam_id: string;
  student_id: string;
  template_id: string;
}

export interface UpdateScanAnswersRequest {
  answers: Record<number, string[]>; // question_id -> selected options
}

export interface UpdateScanAnswersResponse {
  scan_id: string;
  status: string;
  graded_by: string;
  graded_at: string;
}

// Live scanner preview types
export interface Position {
  x: number;
  y: number;
}

export interface QualityFeedback {
  ready_to_scan: boolean;
  blur_detected: boolean;
  too_dark: boolean;
  too_bright: boolean;
  skewed: boolean;
  too_skewed: boolean;
  poor_perspective: boolean;
  message: string;
}

export interface FramePreviewRequest {
  image: string; // base64-encoded JPEG/PNG
  template_id: string;
}

export interface FramePreviewResponse {
  paper_detected: boolean;
  marks_detected: number;
  detected_marks: Position[];
  paper_corners?: Position[]; // Detected paper boundary corners (for live contour display)
  image_height: number;
  image_width: number;
  quality_score?: number;
  quality_feedback: QualityFeedback;
  blur_score?: number;
  brightness?: number;
  skew_angle?: number;
  perspective_quality?: number;
  
  // Debug images (base64-encoded) - entire pipeline
  original_image?: string;
  grayscale_image?: string;
  clahe_image?: string;
  preprocessed_image?: string;
  warped_image?: string;
}