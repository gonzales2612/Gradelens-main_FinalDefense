/**
 * Student TypeScript Types - Frontend
 */

export interface Student {
  _id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  class_ids: string[];
  date_of_birth?: string;
  status: "active" | "inactive" | "graduated";
  grade_id?: string;
  section_id?: string;
  metadata?: {
    guardian_contact?: string;
    notes?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentRequest {
  student_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  class_ids?: string[];
  date_of_birth?: string;
  grade_id?: string;
  section_id?: string;
  metadata?: {
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
  grade_id?: string;
  section_id?: string;
  metadata?: {
    guardian_contact?: string;
    notes?: string;
  };
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page?: number;
  limit?: number;
  pages?: number;
}
