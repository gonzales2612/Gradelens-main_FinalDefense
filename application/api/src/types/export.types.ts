// types/export.types.ts

export interface ExportMetadata {
  grade_id: string;
  grade_name: string;
  class_id: string;
  class_name: string;
  exam_id: string;
  exam_name: string;
  exported_at: Date;
  exported_by?: string;
  academic_year?: string;
}

export interface PLDistributionRow {
  score: number;
  f: number;
  fx: number;
}

export interface PLSectionData {
  section_id: string;
  section_name: string;
  distribution: PLDistributionRow[];
  stats: {
    total_f: number;
    total_fx: number;
    mean: number;
    pl: number;
    mps: number;
  };
  metadata?: {
    hso: number;
    lso: number;
  };
}

export interface PLExportData {
  sections: PLSectionData[];
  overall: PLSectionData | null;
}

export interface ItemEntryRow {
  question_number: number;
  correct_count: number;
  total_students: number;
  percentage: number;
  remark?: string;
  rank_label?: string;
  rank_numbers?: number[];
}

export interface ItemSectionData {
  section_id: string;
  section_name: string;
  items: ItemEntryRow[];
  metadata: {
    students_took_exam: number;
    total_students: number;
    total_questions: number;
    section_total_correct?: number;
  };
}

export interface ItemExportData {
  sections: ItemSectionData[];
  overall: {
    items: ItemEntryRow[];
    metadata: {
      total_students_took_exam: number;
      total_questions: number;
      total_correct: number;
      total_possible: number;
      overall_percentage: number;
    };
  } | null;
}

export interface SummaryData {
  sections: Array<{
    section_id: string;
    section_name: string;
    students_took_exam: number;
    number_of_items: number;
    hso: number;
    lso: number;
    total_scores: number;
    total_students: number;
    mean: number;
    pl: number;
    mps: number;
  }>;
  overall?: {
    total_students_took_exam: number;
    number_of_items: number;
    hso: number;
    lso: number;
    total_scores: number;
    mean: number;
    pl: number;
    mps: number;
  };
}

export interface ReportExportRequest {
  grade_id: string;
  class_id: string;
  exam_id: string;
  exported_by?: string;
}

export interface ExportServiceData {
  metadata: ExportMetadata;
  plData: PLExportData;
  itemData: ItemExportData;
  summaryData: SummaryData;
}
