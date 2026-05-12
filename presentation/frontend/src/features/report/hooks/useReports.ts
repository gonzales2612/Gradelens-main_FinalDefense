// features/report/hooks/useReports.ts
import { useState, useCallback } from "react";
import { reportsApi } from "@/features/report/api/reports.api";
import type { 
  PLEntriesResponse,
  ItemEntriesResponse 
} from "@/features/report/types/reports.types";
import { getErrorMessage } from "@/lib/error";

export interface UseReportsParams {
  grade_id: string;
  class_id: string;
  exam_id: string;
}

export interface UsePLEntriesParams extends UseReportsParams {
  view?: "section" | "overall";
}

export interface UseItemEntriesParams extends UseReportsParams {
  view?: "section" | "overall";
}

export function useReports() {
  const [plData, setPlData] = useState<PLEntriesResponse | null>(null);
  const [itemData, setItemData] = useState<ItemEntriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPLEntries = useCallback(async (params: UsePLEntriesParams) => {
    if (!params.grade_id || !params.class_id || !params.exam_id) {
      setError("Missing required parameters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await reportsApi.getPLEntries({
        grade_id: params.grade_id,
        class_id: params.class_id,
        exam_id: params.exam_id,
        view: params.view || "section",
      });
      
      if (!response || !response.sections) {
        throw new Error("Invalid response format from API");
      }
      
      setPlData(response);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load PL Entries");
      console.error("Failed to load PL entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItemEntries = useCallback(async (params: UseItemEntriesParams) => {
    if (!params.grade_id || !params.class_id || !params.exam_id) {
      setError("Missing required parameters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await reportsApi.getItemEntries({
        grade_id: params.grade_id,
        class_id: params.class_id,
        exam_id: params.exam_id,
        view: params.view || "section",
      });
      
      if (!response || !response.sections) {
        throw new Error("Invalid response format from API");
      }
      
      setItemData(response);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load Item Entries");
      console.error("Failed to load item entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPlData(null);
    setItemData(null);
    setError(null);
    setLoading(false);
  }, []);

  const exportReport = useCallback(async (params: UseReportsParams) => {
    if (!params.grade_id || !params.class_id || !params.exam_id) {
      setError("Missing required parameters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await reportsApi.exportReport({
        grade_id: params.grade_id,
        class_id: params.class_id,
        exam_id: params.exam_id,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to export report");
      console.error("Failed to export report:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    plData,
    itemData,
    loading,
    error,
    loadPLEntries,
    loadItemEntries,
    exportReport,
    reset,
  };
}
