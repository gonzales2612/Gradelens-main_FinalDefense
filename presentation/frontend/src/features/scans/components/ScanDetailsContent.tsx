import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { IconCheck, IconClock, IconArrowRight, IconPhotoOff, IconFilePencil, IconUser, IconClipboardCheck } from "@tabler/icons-react";
import type { Scan, QuestionDetection, DetectionError } from "@packages/types/scans/scans.types";
import type { Exam } from "@/features/exams/types/exams.types";
import type { Student } from "@/features/students/types/students.types";

interface ScanDetailsContentProps {
  scan: Scan;
  exam?: Exam;
  student?: Student;
  detections: QuestionDetection[];
  errors: DetectionError[];
  stats: {
    total: number;
    answered: number;
    unanswered: number;
    ambiguous: number;
    avgConfidence: number;
  };
  isDialog?: boolean;
  onOpenEditDialog?: () => void;
  failedImages: Set<string>;
  onImageError: (imagePath: string) => void;
}

export function ScanDetailsContent({
  scan,
  exam,
  student,
  detections,
  errors,
  stats,
  isDialog = false,
  onOpenEditDialog,
  failedImages,
  onImageError,
}: ScanDetailsContentProps) {
  return (
    <div className={`space-y-${isDialog ? '6' : '4'}`}>
      {/* Student & Exam Info */}
      {(student || exam || (scan.grading_result && scan.grading_result.score)) && (
        <div className="rounded-xl bg-background/60 p-4 border-x border-border shadow-sm">
          <div className="text-sm flex justify-evenly gap-3 flex-wrap">
            {student && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <IconUser size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium leading-tight">
                    {student.first_name} {student.last_name}
                  </p>
                </div>
              </div>
            )}

            {exam && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <IconClipboardCheck size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exam</p>
                  <p className="font-medium leading-tight">{exam.name}</p>
                </div>
              </div>
            )}

            {scan.grading_result && scan.grading_result.score && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <IconCheck size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="font-medium leading-tight">
                    {scan.grading_result.score.points_earned}/{scan.grading_result.score.points_possible} pts
                    <span className="text-xs text-muted-foreground ml-1">
                      ({scan.grading_result.score.percentage.toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {(scan.status === "processing" || scan.status === "queued") && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <IconClock className="h-4 w-4 animate-spin" />
          <span className="font-medium">Processing scan, please wait...</span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">Errors</h4>
          {errors.map((error, i: number) => (
            <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs">
              <div className="font-medium">{error.code}</div>
              <div className="text-muted-foreground">{error.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {detections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Statistics</h4>
          <div className={`grid ${isDialog ? 'grid-cols-4' : 'grid-cols-2'} gap-2 text-xs`}>
            <div className="rounded-lg border bg-muted/30 p-2">
              <div className="text-muted-foreground">Total Questions</div>
              <div className="text-lg font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2">
              <div className="text-muted-foreground">Answered</div>
              <div className="text-lg font-bold text-green-600">{stats.answered}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2">
              <div className="text-muted-foreground">Unanswered</div>
              <div className="text-lg font-bold text-gray-500">{stats.unanswered}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2">
              <div className="text-muted-foreground">Avg Confidence</div>
              <div className="text-lg font-bold">{(stats.avgConfidence * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Time */}
      {scan.processing_time_ms && (
        <div className="text-xs text-muted-foreground">
          Processing time: <span className="font-mono">{scan.processing_time_ms.toFixed(0)}ms</span>
        </div>
      )}

      {/* Question Detections */}
      {detections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Detected Answers</h4>
          <ScrollArea className={isDialog ? "h-96" : "h-75 border rounded-md"}>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-2">
              {detections.map((detection) => {
                const isManuallyEdited = detection.manually_edited;
                return (
                  <div
                    key={detection.question_id}
                    className={`relative flex flex-col items-center justify-center rounded-lg border p-1 text-xs transition-all hover:shadow-md ${
                      isManuallyEdited
                        ? "bg-orange-50 border-orange-300 hover:border-orange-400"
                        : detection.detection_status === "answered"
                        ? "bg-green-50 border-green-300 hover:border-green-400"
                        : detection.detection_status === "ambiguous"
                        ? "bg-amber-50 border-amber-300 hover:border-amber-400"
                        : "bg-gray-50 border-gray-300 hover:border-gray-400"
                    }`}
                    title={`Confidence: ${((detection.confidence || 0) * 100).toFixed(0)}%${isManuallyEdited ? ' (Manually Edited)' : ''}`}
                  >
                    {detection.detection_status === "answered" && !isManuallyEdited && (
                      <IconCheck className="absolute top-1 right-1 h-3 w-3 text-green-600" />
                    )}
                    {isManuallyEdited && (
                      <IconFilePencil className="absolute top-1 right-1 h-3 w-3 text-orange-600" />
                    )}
                    <span className="font-mono font-bold text-sm mb-1">Q{detection.question_id}</span>
                    {detection.selected.length > 0 ? (
                      <span className="font-mono font-semibold text-base">
                        {detection.selected.join(", ")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-base">—</span>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground mt-1">
                      {((detection.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-2 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-50 border border-green-300"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-50 border border-gray-300"></div>
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-50 border border-amber-300"></div>
              <span>Ambiguous</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-50 border border-orange-300"></div>
              <span>Manually Edited</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Answers Button */}
      {detections.length > 0 && exam?.answers && exam.answers.length > 0 && !isDialog && onOpenEditDialog && (
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onOpenEditDialog}
          >
            <IconFilePencil className="h-4 w-4 mr-2" />
            Compare Answers
          </Button>
        </div>
      )}
      
      {/* Advanced: Pipeline Visualization (Dialog Only) */}
      {isDialog && scan.detection_result?.pipeline_images && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="pipeline" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              Advanced: Pipeline Visualization
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {/* Pipeline Images Grid */}
                <div className="flex flex-wrap items-center gap-3">
                  {scan.detection_result.pipeline_images.original && (
                    <>
                      {failedImages.has(scan.detection_result.pipeline_images.original) ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-xs font-medium text-muted-foreground text-center">Original</div>
                          <div className="w-32 h-32 rounded border-2 border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center gap-2 p-2">
                            <IconPhotoOff className="h-8 w-8 text-destructive/50" />
                            <span className="text-xs text-destructive/70 text-center">Image not found</span>
                          </div>
                        </div>
                      ) : (
                        <a
                          href={`${import.meta.env.VITE_CV_SERVICE_URL}/storage/${scan.detection_result.pipeline_images.original}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col items-center gap-1 transition-transform hover:scale-105"
                        >
                          <div className="text-xs font-medium text-muted-foreground text-center">Original</div>
                          <img 
                            src={`${import.meta.env.VITE_CV_SERVICE_URL}/storage/${scan.detection_result.pipeline_images.original}`}
                            alt="Original"
                            className="w-32 h-32 object-cover rounded border-2 border-border bg-white shadow-sm group-hover:border-primary transition-colors cursor-pointer"
                            loading="lazy"
                            onError={() => onImageError(scan.detection_result!.pipeline_images!.original!)}
                          />
                        </a>
                      )}
                      {scan.detection_result.pipeline_images.grayscale && (
                        <IconArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </>
                  )}
                  
                  {/* Additional pipeline images would follow the same pattern... */}
                  {/* Grayscale, CLAHE, Binary, etc. - same structure as ViewAdvancedDialog */}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
