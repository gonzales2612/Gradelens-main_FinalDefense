import { api } from "@/api/axios";
import type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  StudentListResponse,
} from "../types/students.types.ts";

export const studentsApi = {
  /**
   * Get all students
   */
  async list(params?: {
    status?: string;
    class_id?: string;
    page?: number;
    limit?: number;
  }): Promise<StudentListResponse> {
    const { data } = await api.get("/students", { params });
    return data;
  },

  /**
   * Get student by ID
   */
  async getById(id: string): Promise<{ student: Student }> {
    const { data } = await api.get(`/students/${id}`);
    return data;
  },

  /**
   * Get student by student_id
   */
  async getByStudentId(studentId: string): Promise<{ student: Student }> {
    const { data } = await api.get(`/students/by-student-id/${studentId}`);
    return data;
  },

  /**
   * Create new student
   */
  async create(student: CreateStudentRequest): Promise<{ message: string; student: Student }> {
    const { data } = await api.post("/students", student);
    return data;
  },

  /**
   * Update student
   */
  async update(
    id: string,
    updates: UpdateStudentRequest
  ): Promise<{ message: string; student: Student }> {
    const { data } = await api.put(`/students/${id}`, updates);
    return data;
  },

  /**
   * Delete (deactivate) student
   */
  async delete(id: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/students/${id}`);
    return data;
  },
};
