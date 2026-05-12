export interface Grade {
  _id: string;
  grade_id: string;
  name: string;
  level: number;
  description?: string;
  is_active: boolean;
  created_by: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeRequest {
  grade_id?: string;
  name: string;
  level: number;
  description?: string;
}

export interface UpdateGradeRequest {
  name?: string;
  level?: number;
  description?: string;
}

export interface GradeListResponse {
  grades: Grade[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
