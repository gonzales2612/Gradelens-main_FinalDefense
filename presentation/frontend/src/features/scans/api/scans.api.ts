import { api } from "@/api/axios";
import type { 
  Scan, 
  UploadScanRequest, 
  UploadScanResponse,
  UpdateScanAnswersRequest,
  UpdateScanAnswersResponse,
  FramePreviewRequest,
  FramePreviewResponse
} from "@packages/types/scans/scans.types";

const CV_SERVICE_URL = import.meta.env.VITE_CV_SERVICE_URL || "http://localhost:8000";

export const uploadScanApi = async (
  payload: UploadScanRequest
): Promise<UploadScanResponse> => {
  const { data } = await api.post<UploadScanResponse>("/scans", payload);
  return data;
};

export const uploadAnswerKeyScanApi = async (
  image: string,
  template_id: string
): Promise<UploadScanResponse> => {
  const { data } = await api.post<UploadScanResponse>("/scans/answer-key", {
    image,
    template_id,
  });
  return data;
};

export const fetchScansApi = async (): Promise<Scan[]> => {
  const { data } = await api.get<Scan[]>("/scans");
  return data;
};

export const fetchScanApi = async (scanId: string): Promise<Scan> => {
  const { data } = await api.get<Scan>(`/scans/${scanId}`);
  return data;
};

export const updateScanAnswersApi = async (
  scanId: string,
  payload: UpdateScanAnswersRequest
): Promise<UpdateScanAnswersResponse> => {
  const { data } = await api.patch<UpdateScanAnswersResponse>(
    `/scans/${scanId}/answers`,
    payload
  );
  return data;
};

export const markScanAsReviewedApi = async (
  scanId: string,
  reviewNotes?: string
): Promise<{ scan_id: string; status: string; reviewed_by: string; reviewed_at: string }> => {
  const { data } = await api.patch(`/scans/${scanId}/reviewed`, 
    { review_notes: reviewNotes }
  );
  return data;
};

export const deleteScanApi = async (scanId: string): Promise<{ message: string; scan_id: string }> => {
  const { data } = await api.delete(`/scans/${scanId}`);
  return data;
};

export const previewFrameApi = async (
  payload: FramePreviewRequest
): Promise<FramePreviewResponse> => {
  const response = await fetch(`${CV_SERVICE_URL}/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Preview failed: ${response.statusText}`);
  }

  return response.json();
};