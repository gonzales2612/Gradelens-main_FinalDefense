import { useState, useCallback } from "react";
import { sectionsApi } from "../api/sections.api";
import type { Section, CreateSectionRequest, UpdateSectionRequest } from "../types/sections.types";
import { getErrorMessage } from "@/lib/error";

export function useSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadSections = useCallback(async (params?: { page?: number; limit?: number; grade_id?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await sectionsApi.list(params);
      setSections(response.sections);
      setTotal(response.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to loada sections");
      console.error("Error loading sections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSection = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await sectionsApi.getById(id);
      setSelectedSection(response.section);
      return response.section;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load section");
      console.error("Error loading section:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSection = useCallback(async (data: CreateSectionRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await sectionsApi.create(data);
      await loadSections();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create sections");
      console.error("Error creating section:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSections]);

  const updateSection = useCallback(async (id: string, updates: UpdateSectionRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await sectionsApi.update(id, updates);
      await loadSections();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update sections");
      console.error("Error updating section:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSections]);

  const deleteSection = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await sectionsApi.delete(id);
      await loadSections();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to delete sections");
      console.error("Error deleting section:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSections]);

  return {
    sections,
    selectedSection,
    loading,
    error,
    total,
    loadSections,
    loadSection,
    createSection,
    updateSection,
    deleteSection,
  };
}
