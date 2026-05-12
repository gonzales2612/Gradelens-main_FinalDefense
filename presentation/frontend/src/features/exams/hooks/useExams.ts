import { useState, useCallback } from "react";
import { ExamsApi } from "../api/exams.api";
import type { Exam, CreateExamRequest, UpdateExamRequest, ExamStatistics } from "../types/exams.types";
import { getErrorMessage } from "@/lib/error";

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [statistics, setStatistics] = useState<ExamStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadExams = useCallback(async (params?: {
    status?: string;
    class_id?: string;
    template_id?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ExamsApi.list(params);
      setExams(data.exams);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load exams");
      console.error("Failed to load exams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExam = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ExamsApi.getById(id);
      setSelectedExam(data.exam);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load exam");
      console.error("Failed to load exam:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createExam = useCallback(async (exam: CreateExamRequest) => {
    setLoading(true);
    setError(null);
    try {
      await ExamsApi.create(exam);
      await loadExams();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create exam");
      console.error("Failed to create exam:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadExams]);

  const updateExam = useCallback(async (id: string, updates: UpdateExamRequest) => {
    setLoading(true);
    setError(null);
    try {
      await ExamsApi.update(id, updates);
      await loadExams();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update exam");
      console.error("Failed to update exam:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadExams]);

  const deleteExam = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await ExamsApi.delete(id);
      await loadExams();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to delete exam");
      console.error("Failed to delete exam:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadExams]);

  const updateStatus = useCallback(async (
    id: string,
    status: "draft" | "active" | "completed" | "archived"
  ) => {
    setLoading(true);
    setError(null);
    try {
      await ExamsApi.updateStatus(id, status);
      await loadExams();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update status");
      console.error("Failed to update status:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadExams]);

  const loadStatistics = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ExamsApi.getStatistics(id);
      setStatistics(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load statistics");
      console.error("Failed to load statistics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    exams,
    selectedExam,
    statistics,
    loading,
    error,
    total,
    loadExams,
    loadExam,
    createExam,
    updateExam,
    deleteExam,
    updateStatus,
    loadStatistics,
  };
}
