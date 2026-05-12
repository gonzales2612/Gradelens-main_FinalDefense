// features/report/api/reports.api.ts
import { api } from "@/api/axios";
import type { 
  PLEntriesResponse, 
  PLEntriesQueryParams,
  ItemEntriesResponse,
  ItemEntriesQueryParams 
} from "../types/reports.types";

export const reportsApi = {
  /**
   * Fetch PL Entries for a specific grade, class, and exam
   */
  async getPLEntries(params: PLEntriesQueryParams): Promise<PLEntriesResponse> {
    const { data } = await api.get<PLEntriesResponse>("/reports/pl-entries", {
      params: {
        grade_id: params.grade_id,
        class_id: params.class_id,
        exam_id: params.exam_id,
        view: params.view || "section",
      },
    });
    return data;
  },

  /**
   * Fetch Item Entries for a specific grade, class, and exam
   */
  async getItemEntries(params: ItemEntriesQueryParams): Promise<ItemEntriesResponse> {
    const { data } = await api.get<ItemEntriesResponse>("/reports/item-entries", {
      params: {
        grade_id: params.grade_id,
        class_id: params.class_id,
        exam_id: params.exam_id,
        view: params.view || "section",
      },
    });
    return data;
  },

  /**
   * Export report as Excel file
   * Downloads the file directly
   */
  async exportReport(params: {
    grade_id: string;
    class_id: string;
    exam_id: string;
  }): Promise<void> {
    const response = await api.get("/reports/export", {
      params: {
        grade_id: params.grade_id,
        class_id: params.class_id,
        exam_id: params.exam_id,
      },
      responseType: "blob",
    });

    // Create download link
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Extract filename from Content-Disposition header (check both cases)
    const contentDisposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
    let filename = `Report_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.xlsx`; // Fallback with timestamp
    
    if (contentDisposition) {
      // Try multiple regex patterns to extract filename
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=(?:UTF-8'')?["']?([^"'\n]*)["']?/i);
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1]);
      }
    }
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};