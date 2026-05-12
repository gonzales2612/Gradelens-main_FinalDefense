import { useMemo } from "react";
import type { Scan } from "@packages/types/scans/scans.types";

interface UseDuplicateScanProps {
  scans: Scan[];
  selectedExam: string;
  selectedStudent: string;
}

interface DuplicateScanInfo {
  hasDuplicate: boolean;
  existingScan?: Scan;
}

/**
 * Hook to detect if a scan already exists for the selected exam + student combination
 */
export function useDuplicateScan({
  scans,
  selectedExam,
  selectedStudent,
}: UseDuplicateScanProps): DuplicateScanInfo {
  const duplicateInfo = useMemo(() => {
    if (!selectedExam || !selectedStudent) {
      return { hasDuplicate: false };
    }

    // Find existing scan for this exam + student (excluding outdated, failed, error)
    const existingScan = scans.find(
      (scan) =>
        scan.exam_id === selectedExam &&
        scan.student_id === selectedStudent &&
        scan.status !== "outdated" &&
        scan.status !== "failed" &&
        scan.status !== "error"
    );

    return {
      hasDuplicate: !!existingScan,
      existingScan,
    };
  }, [scans, selectedExam, selectedStudent]);

  return duplicateInfo;
}
