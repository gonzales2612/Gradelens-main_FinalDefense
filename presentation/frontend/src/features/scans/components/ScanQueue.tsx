import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconCheck, IconClock, IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Scan } from "@packages/types/scans/scans.types";
import type { Exam } from "@/features/exams/types/exams.types";
import type { Student } from "@/features/students/types/students.types";

interface ScanQueueProps {
  scans: Scan[];
  selectedScanId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  exams: Exam[];
  students: Student[];
  showProfileLink?: boolean;
}

export function ScanQueue({
  scans,
  selectedScanId,
  onSelect,
  onDelete,
  exams,
  students,
  showProfileLink = false,
}: ScanQueueProps) {
  return (
    <Card className="shadow-sm flex flex-col max-h-[calc(100vh-1rem)]">
      <CardHeader className="pb-3 border-b border-border shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          Scan Queue
          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-bold">
            {scans.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-3 flex-1 overflow-auto min-h-0">
        {scans.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No scans in queue</p>
        )}
        
        {scans.map((scan) => {
          const exam = exams.find((q) => q._id === scan.exam_id);
          const student = students.find((s) => s._id === scan.student_id);
          
          return (
            <button
              key={scan.scan_id}
              onClick={() => onSelect(scan.scan_id)}
              className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                selectedScanId === scan.scan_id
                  ? 'bg-primary/5 border-primary/50'
                  : scan.status === 'outdated'
                  ? 'bg-muted/50 border-border/50 opacity-60'
                  : 'bg-background border-border hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <p className={`font-medium truncate ${scan.status === 'outdated' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'}
                    </p>
                    {showProfileLink && student && (
                      <Link
                        to={`/students/${student._id}`}
                        className="text-xs text-primary hover:underline block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Profile
                      </Link>
                    )}
                  </span>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {exam?.name || 'Unknown Exam'}
                    {scan.status === 'outdated' && <span className="ml-1 text-orange-600 font-medium">(Outdated)</span>}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this scan?')) {
                          Promise.resolve(onDelete(scan.scan_id))
                            .then(() => {
                              toast.success("Scan deleted", {
                                description: "The scan has been successfully deleted.",
                              });
                            })
                            .catch((err) => {
                              toast.error("Failed to delete", {
                                description: err instanceof Error ? err.message : "Failed to delete scan",
                              });
                            });
                        }
                      }}
                      className="p-1 hover:bg-destructive/10 rounded transition-colors"
                      title="Delete scan"
                    >
                      <IconTrash className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  )}
                  {scan.status === 'graded' && <IconCheck className="h-4 w-4 text-green-500" />}
                  {scan.status === 'processing' && (
                    <IconClock className="h-4 w-4 animate-pulse text-primary" />
                  )}
                  {scan.status === 'failed' && <IconAlertCircle className="h-4 w-4 text-destructive" />}
                  {scan.status === 'queued' && (
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  )}
                  {scan.status === 'outdated' && (
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
