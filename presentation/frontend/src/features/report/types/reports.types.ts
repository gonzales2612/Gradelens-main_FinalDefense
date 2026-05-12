// features/report/types/reports.types.ts

/**
 * PL Entries Types
 */
export interface PLEntriesDistributionRow {
  score: number;
  f: number;  // frequency
  fx: number; // frequency × score
}

export interface PLEntriesStatistics {
  mean: number;
  pl_percentage: number; // Performance Level percentage
  mps: number;          // Mean Percentage Score
  total_f: number;
  total_fx: number;
}

export interface PLEntriesMetadata {
  total_points: number;
  student_count: number;
  scan_count: number;
  number_of_items: number; // Total questions in exam
  hso: number;            // Highest Score Obtained
  lso: number;            // Lowest Score Obtained
}

export interface PLEntriesSection {
  section_id: string;
  section_name: string;
  statistics: PLEntriesStatistics;
  distribution: PLEntriesDistributionRow[];
  metadata: PLEntriesMetadata;
}

export interface IPLEntriesOverall {
  statistics: PLEntriesStatistics;
  distribution: PLEntriesDistributionRow[];
  metadata: PLEntriesMetadata;
}

export interface PLEntriesResponse {
  view: "section" | "overall";
  sections: PLEntriesSection[];
  overall: IPLEntriesOverall | null;
}

export interface PLEntriesQueryParams {
  grade_id: string;
  class_id: string;
  exam_id: string;
  view?: "section" | "overall";
}

/**
 * Item Entries Types
 */
export interface ItemEntriesItem {
  question_number: number;
  correct_count: number;
  total_students: number;
  rank_label: string | null;
  percentage: number;
  remark: "M" | "NM" | "NTM";
}

export interface ItemEntriesSectionMetadata {
  total_students: number;
  total_questions: number;
  students_took_exam: number;
  section_total_correct: number;
}

export interface IItemEntriesSection {
  section_id: string;
  section_name: string;
  items: ItemEntriesItem[];
  metadata: ItemEntriesSectionMetadata;
}

export interface ItemEntriesOverallMetadata {
  total_students_took_exam: number;
  total_questions: number;
  total_correct: number;
  total_possible: number;
  overall_percentage: number;
}

export interface IItemEntriesOverall {
  items: ItemEntriesItem[];
  metadata: ItemEntriesOverallMetadata;
}

export interface ItemEntriesResponse {
  view: "section" | "overall";
  sections: IItemEntriesSection[];
  overall: IItemEntriesOverall | null;
}

export interface ItemEntriesQueryParams {
  grade_id: string;
  class_id: string;
  exam_id: string;
  view?: "section" | "overall";
}