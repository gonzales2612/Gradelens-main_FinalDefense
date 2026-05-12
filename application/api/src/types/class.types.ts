/**
 * Class TypeScript Types
 * Frontend type definitions for Class entity
 */

export interface Class {
  _id: string;
  class_id: string;              // Unique class identifier
  name: string;
  description?: string;
  teacher_id: string;            // User ID of teacher
  student_ids: string[];         // Array of Student ObjectIds
  student_count?: number;        // Virtual field
  academic_year: string;         // e.g., "2025-2026"
  section_ids?: string[];
  status: "active" | "archived" | "completed";
  metadata?: {
    schedule?: string;
    room?: string;
    notes?: string;
  };
  created_by: string;
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
}

export interface CreateClassRequest {
  class_id: string;
  name: string;
  description?: string;
  academic_year: string;
  section_ids?: string[];
  subject?: string;
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
  subject?: string;
  status?: "active" | "archived" | "completed";
  student_ids?: string[];  // Allow updating student list
  metadata?: {
    schedule?: string;
    room?: string;
    notes?: string;
  };
}

export interface AddStudentToClassRequest {
  student_id: string;
}

export interface RemoveStudentFromClassRequest {
  student_id: string;
}

export interface ClassListResponse {
  classes: Class[];
  total: number;
  page?: number;
  limit?: number;
}

export interface ClassWithStudents extends Class {
  students?: Array<{
    _id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    email?: string;
  }>;
}
