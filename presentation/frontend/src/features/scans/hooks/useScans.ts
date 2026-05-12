// features/scans/hooks/useScans.ts
import { useScansStore } from "../stores/scans.store";

export function useScans() {
  const scans = useScansStore((state) => state.scans);
  const selectedScanId = useScansStore((state) => state.selectedScanId);
  const selectedScan = useScansStore((state) => state.selectedScan);
  const isLoading = useScansStore((state) => state.isLoading);
  const isPolling = useScansStore((state) => state.isPolling);
  const isPollingRequest = useScansStore((state) => (state).isPollingRequest);
  const error = useScansStore((state) => state.error);
  
  const loadScans = useScansStore((state) => state.loadScans);
  const selectScan = useScansStore((state) => state.selectScan);
  const deselectScan = useScansStore((state) => state.deselectScan);
  const uploadScan = useScansStore((state) => state.uploadScan);
  const updateScanAnswers = useScansStore((state) => state.updateScanAnswers);
  const markScanAsReviewed = useScansStore((state) => state.markScanAsReviewed);
  const deleteScan = useScansStore((state) => state.deleteScan);
  const refreshSelectedScan = useScansStore((state) => state.refreshSelectedScan);

  return {
    scans,
    selectedScanId,
    selectedScan,
    isLoading,
    isPolling,
    isPollingRequest,
    error,
    loadScans,
    selectScan,
    deselectScan,
    uploadScan,
    updateScanAnswers,
    markScanAsReviewed,
    deleteScan,
    refreshSelectedScan,
  };
}