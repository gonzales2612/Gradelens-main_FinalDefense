import { api } from "@/api/axios";
import type { Grade, GradeListResponse, CreateGradeRequest, UpdateGradeRequest } from "../types/grades.types";

export const gradesApi = {
  list: async (params?: { page?: number; limit?: number }): Promise<GradeListResponse> => {
    const response = await api.get("/grades", { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ grade: Grade }> => {
    const response = await api.get(`/grades/${id}`);
    return response.data;
  },

  create: async (data: CreateGradeRequest): Promise<{ message: string; grade: Grade }> => {
    const response = await api.post("/grades", data);
    return response.data;
  },

  update: async (id: string, data: UpdateGradeRequest): Promise<{ message: string; grade: Grade }> => {
    const response = await api.put(`/grades/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/grades/${id}`);
    return response.data;
  },
};
