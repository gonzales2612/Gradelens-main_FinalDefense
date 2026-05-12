// features/scans/stores/scans.store.ts
import { create } from "zustand";
import { 
  fetchScansApi, 
  fetchScanApi, 
  uploadScanApi, 
  updateScanAnswersApi,
  markScanAsReviewedApi,
  deleteScanApi
} from "../api/scans.api";
import type { 
  Scan, 
  UploadScanRequest,
  UpdateScanAnswersRequest 
} from "@packages/types/scans/scans.types";

type ScansState = {
  // State
  scans: Scan[];
  selectedScanId: string | null;
  selectedScan: Scan | null;
  isLoading: boolean;
  isPolling: boolean;
  isPollingRequest: boolean;
  error: string | null;
  
  // Polling control
  pollingIntervalId: number | null;
  
  // Actions
  loadScans: () => Promise<void>;
  selectScan: (scanId: string) => void;
  deselectScan: () => void;
  uploadScan: (payload: UploadScanRequest) => Promise<string>; // Returns scan_id
  updateScanAnswers: (scanId: string, payload: UpdateScanAnswersRequest) => Promise<void>;
  markScanAsReviewed: (scanId: string, reviewNotes?: string) => Promise<void>;
  deleteScan: (scanId: string) => Promise<void>;
  refreshSelectedScan: () => Promise<void>;
  
  // Internal polling methods
  startPolling: () => void;
  stopPolling: () => void;
  pollScan: () => Promise<void>;
};

// Terminal statuses where we stop polling
const TERMINAL_STATUSES = ["detected", "graded", "reviewed", "failed", "error"];
const POLLING_INTERVAL = 2000; // 2 seconds

const isTerminalStatus = (status: string): boolean => {
  return TERMINAL_STATUSES.includes(status);
};

export const useScansStore = create<ScansState>((set, get) => ({
  // Initial state
  scans: [],
  selectedScanId: null,
  selectedScan: null,
  isLoading: false,
  isPolling: false,
  isPollingRequest: false,
  error: null,
  pollingIntervalId: null,

  // Load all scans
  loadScans: async () => {
    set({ isLoading: true, error: null });
    try {
      const scans = await fetchScansApi();
      set({ scans, isLoading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load scans";
      set({ error: errorMessage, isLoading: false });
      console.error("Failed to load scans:", err);
    }
  },

  // Select a scan and start polling
  selectScan: (scanId: string) => {
    const state = get();
    
    // Stop any existing polling
    if (state.pollingIntervalId) {
      clearInterval(state.pollingIntervalId);
    }

    // Keep the currently displayed `selectedScan` until the new scan is fetched
    set({ 
      selectedScanId: scanId,
      isPolling: true,
      pollingIntervalId: null 
    });

    // Start polling this scan
    get().startPolling();
  },

  // Deselect scan and stop polling
  deselectScan: () => {
    const state = get();
    if (state.pollingIntervalId) {
      clearInterval(state.pollingIntervalId);
    }
    set({ 
      selectedScanId: null, 
      selectedScan: null, 
      isPolling: false,
      pollingIntervalId: null 
    });
  },

  // Upload a new scan
  uploadScan: async (payload: UploadScanRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await uploadScanApi(payload);
      
      // Refresh scans list
      await get().loadScans();
      
      set({ isLoading: false });
      return response.scan_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload scan";
      set({ error: errorMessage, isLoading: false });
      console.error("Failed to upload scan:", err);
      throw err;
    }
  },

  // Update scan answers
  updateScanAnswers: async (scanId: string, payload: UpdateScanAnswersRequest) => {
    try {
      await updateScanAnswersApi(scanId, payload);
      
      // Refresh the selected scan immediately
      await get().refreshSelectedScan();
      
      // Also refresh the scans list
      await get().loadScans();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update scan answers";
      set({ error: errorMessage });
      console.error("Failed to update scan answers:", err);
      throw err;
    }
  },

  // Mark scan as reviewed
  markScanAsReviewed: async (scanId: string, reviewNotes?: string) => {
    try {
      await markScanAsReviewedApi(scanId, reviewNotes);
      
      // Refresh the selected scan immediately
      await get().refreshSelectedScan();
      
      // Also refresh the scans list
      await get().loadScans();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to mark scan as reviewed";
      set({ error: errorMessage });
      console.error("Failed to mark scan as reviewed:", err);
      throw err;
    }
  },

  // Delete scan
  deleteScan: async (scanId: string) => {
    try {
      await deleteScanApi(scanId);
      
      // If the deleted scan was selected, deselect it
      const state = get();
      if (state.selectedScanId === scanId) {
        get().deselectScan();
      }
      
      // Refresh the scans list
      await get().loadScans();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete scan";
      set({ error: errorMessage });
      console.error("Failed to delete scan:", err);
      throw err;
    }
  },

  // Refresh the currently selected scan
  refreshSelectedScan: async () => {
    const state = get();
    if (!state.selectedScanId) return;

    try {
      const scan = await fetchScanApi(state.selectedScanId);
      set({ selectedScan: { ...scan } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh selected scan";
      set({ error: errorMessage });
      console.error("Failed to refresh selected scan:", err);
    }
  },

  // Start polling the selected scan
  startPolling: () => {
    const state = get();
    
    // Don't start if already polling or no scan selected
    if (state.pollingIntervalId || !state.selectedScanId) return;

    // Initial fetch
    get().pollScan();

    // Set up interval
    const intervalId = setInterval(() => {
      get().pollScan();
    }, POLLING_INTERVAL);

    set({ pollingIntervalId: intervalId as unknown as number, isPolling: true });
  },

  // Stop polling
  stopPolling: () => {
    const state = get();
    if (state.pollingIntervalId) {
      clearInterval(state.pollingIntervalId);
      set({ pollingIntervalId: null, isPolling: false });
    }
  },

  // Poll the selected scan once
  pollScan: async () => {
    const state = get();
    if (!state.selectedScanId) {
      get().stopPolling();
      return;
    }

    // Mark that a poll request is in-flight
    set({ isPollingRequest: true, error: null });

    const scanIdAtRequest = state.selectedScanId;
    try {
      const scan = await fetchScanApi(scanIdAtRequest);

      // Guard against stale responses: if selectedScanId changed since request started, ignore
      if (get().selectedScanId !== scanIdAtRequest) {
        return;
      }

      // Update selectedScan
      set({ selectedScan: scan });

      // Also update the scan in the scans array to keep the queue in sync
      set((state) => ({
        scans: state.scans.map((s) => 
          s.scan_id === scan.scan_id ? scan : s
        )
      }));

      // Stop polling if terminal status reached
      if (isTerminalStatus(scan.status)) {
        get().stopPolling();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Scan polling error";
      set({ error: errorMessage });
      console.error("Scan polling error:", err);
      // Don't stop polling on error - might be temporary network issue
    } finally {
      set({ isPollingRequest: false });
    }
  },
}));