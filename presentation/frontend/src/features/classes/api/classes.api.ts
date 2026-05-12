import { api } from "@/api/axios";
import type {
  Class,
  CreateClassRequest,
  UpdateClassRequest,
  ClassListResponse,
} from "../types/classes.types.ts";
import type { Student } from "@/features/students/types/students.types.ts";

export const classesApi = {
  /**
   * Get all classes
   */
  async list(params?: {
    status?: string;
    academic_year?: string;
    page?: number;
    limit?: number;
  }): Promise<ClassListResponse> {
    const { data } = await api.get("/classes", { params });
    return data;
  },

  /**
   * Get class by ID
   */
  async getById(id: string, populateStudents = false): Promise<{ class: Class }> {
    const { data } = await api.get(`/classes/${id}`, {
      params: { populate_students: populateStudents },
    });
    return data;
  },

  /**
   * Create new class
   */
  async create(classData: CreateClassRequest): Promise<{ message: string; class: Class }> {
    const { data } = await api.post("/classes", classData);
    return data;
  },

  /**
   * Update class
   */
  async update(
    id: string,
    updates: UpdateClassRequest
  ): Promise<{ message: string; class: Class }> {
    const { data } = await api.put(`/classes/${id}`, updates);
    return data;
  },

  /**
   * Delete (archive) class
   */
  async delete(id: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/classes/${id}`);
    return data;
  },

  /**
   * Get students in class
   */
  async getStudents(id: string): Promise<{ students: Student[]; total: number }> {
    const { data } = await api.get(`/classes/${id}/students`);
    return data;
  },

  /**
   * Add student to class (DEPRECATED): Now using ClassStudentSyncService in backend
   */
  // async addStudent(
  //   classId: string,
  //   studentId: string
  // ): Promise<{ message: string; class: Class }> {
  //   const { data } = await api.post(`/classes/${classId}/students`, { student_id: studentId });
  //   return data;
  // },

  /**
   * Remove student from class (DEPRECATED): Now using ClassStudentSyncService in backend
   */
  // async removeStudent(classId: string, studentId: string): Promise<{ message: string }> {
  //   const { data } = await api.delete(`/classes/${classId}/students/${studentId}`);
  //   return data;
  // },
};
