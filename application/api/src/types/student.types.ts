/**
 * Student TypeScript Types
 * Frontend type definitions for Student entity
 */

export interface Student {
  _id: string;
  student_id: string;           // Unique student identifier
  first_name: string;
  last_name: string;
  full_name?: string;            // Virtual field
  email?: string;
  class_ids: string[];           // Array of Class ObjectIds
  date_of_birth?: string;        // ISO date string
  status: "active" | "inactive" | "graduated";
  metadata?: {
    grade_level?: string;
    section?: string;
    guardian_contact?: string;
    notes?: string;
  };
  created_by: string;
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
}

export interface CreateStudentRequest {
  student_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  class_ids?: string[];
  date_of_birth?: string;
  metadata?: {
    grade_level?: string;
    section?: string;
    guardian_contact?: string;
    notes?: string;
  };
}

export interface UpdateStudentRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  class_ids?: string[];
  date_of_birth?: string;
  status?: "active" | "inactive" | "graduated";
  metadata?: {
    grade_level?: string;
    section?: string;
    guardian_contact?: string;
    notes?: string;
  };
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page?: number;
  limit?: number;
}
