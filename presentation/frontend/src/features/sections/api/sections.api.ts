import { api } from "@/api/axios";
import type { Section, SectionListResponse, CreateSectionRequest, UpdateSectionRequest } from "../types/sections.types";

export const sectionsApi = {
  list: async (params?: { page?: number; limit?: number; grade_id?: string }): Promise<SectionListResponse> => {
    const response = await api.get("/sections", { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ section: Section }> => {
    const response = await api.get(`/sections/${id}`);
    return response.data;
  },

  create: async (data: CreateSectionRequest): Promise<{ message: string; section: Section }> => {
    const response = await api.post("/sections", data);
    return response.data;
  },

  update: async (id: string, data: UpdateSectionRequest): Promise<{ message: string; section: Section }> => {
    const response = await api.put(`/sections/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/sections/${id}`);
    return response.data;
  },
};
