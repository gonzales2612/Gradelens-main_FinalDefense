import { useState, useCallback } from "react";
import { gradesApi } from "../api/grades.api";
import type { Grade, CreateGradeRequest, UpdateGradeRequest } from "../types/grades.types";
import { getErrorMessage } from "@/lib/error";

export function useGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadGrades = useCallback(async (params?: { page?: number; limit?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await gradesApi.list(params);
      setGrades(response.grades);
      setTotal(response.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load grades");
      console.error("Error loading grades:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGrade = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await gradesApi.getById(id);
      setSelectedGrade(response.grade);
      return response.grade;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load grade");
      console.error("Error loading grade:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGrade = useCallback(async (data: CreateGradeRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await gradesApi.create(data);
      await loadGrades();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create grade");
      console.error("Error creating grade:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadGrades]);

  const updateGrade = useCallback(async (id: string, updates: UpdateGradeRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await gradesApi.update(id, updates);
      await loadGrades();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update grade");
      console.error("Error updating grade:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadGrades]);

  const deleteGrade = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await gradesApi.delete(id);
      await loadGrades();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to delete grade");
      console.error("Error deleting grade:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadGrades]);

  return {
    grades,
    selectedGrade,
    loading,
    error,
    total,
    loadGrades,
    loadGrade,
    createGrade,
    updateGrade,
    deleteGrade,
  };
}
