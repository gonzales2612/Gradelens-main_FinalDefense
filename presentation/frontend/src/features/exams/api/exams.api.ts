import { api } from "@/api/axios";
import type {
  Exam,
  CreateExamRequest,
  UpdateExamRequest,
  ExamListResponse,
  ExamStatistics,
} from "../types/exams.types.ts";
import type { Scan } from "@packages/types/scans/scans.types.ts";

export const ExamsApi = {
  /**
   * Get all exams
   */
  async list(params?: {
    status?: string;
    class_id?: string;
    template_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ExamListResponse> {
    const { data } = await api.get("/exams", { params });
    return data;
  },

  /**
   * Get exam by ID
   */
  async getById(id: string): Promise<{ exam: Exam }> {
    const { data } = await api.get(`/exams/${id}`);
    return data;
  },

  /**
   * Create new exam
   */
  async create(exam: CreateExamRequest): Promise<{ message: string; exam: Exam }> {
    const { data } = await api.post("/exams", exam);
    return data;
  },

  /**
   * Update exam
   */
  async update(
    id: string,
    updates: UpdateExamRequest
  ): Promise<{ message: string; exam: Exam }> {
    const { data } = await api.put(`/exams/${id}`, updates);
    return data;
  },

  /**
   * Delete (archive) exam
   */
  async delete(id: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/exams/${id}`);
    return data;
  },

  /**
   * Update exam status
   */
  async updateStatus(
    id: string,
    status: "draft" | "active" | "completed" | "archived"
  ): Promise<{ message: string; exam: Exam }> {
    const { data } = await api.patch(`/exams/${id}/status`, { status });
    return data;
  },

  /**
   * Get exam statistics
   */
  async getStatistics(id: string): Promise<ExamStatistics> {
    const { data } = await api.get(`/exams/${id}/statistics`);
    return data;
  },

  /**
   * Get scans for exam
   */
  async getScans(
    id: string,
    params?: { status?: string; page?: number; limit?: number }
  ): Promise<{ scans: Scan[]; total: number; page: number; limit: number; pages: number }> {
    const { data } = await api.get(`/exams/${id}/scans`, { params });
    return data;
  },
};
