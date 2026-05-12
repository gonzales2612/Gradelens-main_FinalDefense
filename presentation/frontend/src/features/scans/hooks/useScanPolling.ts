import { useEffect, useRef, useState } from "react";
import { fetchScanApi } from "../api/scans.api";
import type { Scan } from "@packages/types/scans/scans.types";

/**
 * Hook to poll a scan until it reaches a terminal status
 * 
 * @param scanId - The scan_id to poll
 * @param enabled - Whether polling is enabled
 * @param interval - Polling interval in ms (default: 2000)
 * @returns Current scan data and loading state
 */
export function useScanPolling(
  scanId: string | undefined,
  enabled: boolean = true,
  interval: number = 2000
) {
  const [scan, setScan] = useState<Scan | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Terminal statuses where we stop polling
  const isTerminalStatus = (status: string) => {
    return ["detected", "graded", "reviewed", "failed", "error"].includes(status);
  };

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't poll if disabled or no scanId
    if (!enabled || !scanId) {
      setScan(undefined);
      return;
    }

    // Initial fetch
    const fetchScan = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchScanApi(scanId);
        setScan(data);

        // Stop polling if terminal status reached
        if (isTerminalStatus(data.status)) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch scan");
        console.error("Scan polling error:", err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchScan();

    // Set up polling interval
    intervalRef.current = setInterval(fetchScan, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [scanId, enabled, interval]);

  return { scan, loading, error };
}
