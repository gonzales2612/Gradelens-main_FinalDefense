/**
 * Class TypeScript Types - Frontend
 */

export interface Class {
  _id: string;
  class_id: string;
  name: string;
  description?: string;
  teacher_id: string;
  student_ids: string[];
  student_count?: number;
  academic_year: string;
  grade_id?: string;
  section_ids?: string[];
  status: "active" | "archived" | "completed";
  metadata?: {
    schedule?: string;
    room?: string;
    notes?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClassRequest {
  class_id: string;
  name: string;
  description?: string;
  academic_year: string;
  grade_id?: string;
  section_ids?: string[];
  student_ids?: string[];
  metadata?: {
    schedule?: string;
    room?: string;
    notes?: string;
  };
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  academic_year?: string;
  grade_id?: string;
  section_ids?: string[];
  status?: "active" | "archived" | "completed";
  metadata?: {
    schedule?: string;
    room?: string;
    notes?: string;
  };
}

export interface ClassListResponse {
  classes: Class[];
  total: number;
  page?: number;
  limit?: number;
  pages?: number;
}
