import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconArrowRight, IconPhotoOff, IconSettingsAutomation } from "@tabler/icons-react";
import type { Scan } from "@packages/types/scans/scans.types";
import type { DetectionWarning, QualityMetrics } from "@packages/types/scans/scans.types";
import { cn } from "@/lib/utils";

interface ViewAdvancedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan: Scan;
  warnings: DetectionWarning[];
  qualityMetrics?: QualityMetrics;
  statusInfo: {
    variant: "default" | "secondary" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  };
  failedImages: Set<string>;
  onImageError: (imagePath: string) => void;
}

export function ViewAdvancedDialog({
  open,
  onOpenChange,
  scan,
  warnings,
  qualityMetrics,
  statusInfo,
  failedImages,
  onImageError,
}: ViewAdvancedDialogProps) {
  const StatusIcon = statusInfo.icon;

  function PipelineStep({
    label,
    imagePath,
  }: {
    label: string;
    imagePath: string;
  }) {
    const failed = failedImages.has(imagePath);

    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>

        {failed ? (
          <div className="w-32 h-32 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center gap-2">
            <IconPhotoOff className="h-8 w-8 text-destructive/50" />
            <span className="text-xs text-destructive/70">Image not found</span>
          </div>
        ) : (
          <a
            href={`${import.meta.env.VITE_CV_SERVICE_URL}/storage/${imagePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <img
              src={`${import.meta.env.VITE_CV_SERVICE_URL}/storage/${imagePath}`}
              className="w-32 h-32 rounded-xl border bg-white shadow-sm transition hover:scale-105 hover:border-primary"
              loading="lazy"
              onError={() => onImageError(imagePath)}
            />
          </a>
        )}
      </div>
    );
  }

  const pipelineSteps = [
    { key: "original", label: "Original" },
    { key: "grayscale", label: "Grayscale" },
    { key: "clahe", label: "CLAHE" },
    { key: "binary", label: "Binary" },
    { key: "paper_detection", label: "Paper Detection" },
    { key: "perspective_corrected", label: "Perspective Corrected" },
    { key: "aligned", label: "Aligned" },
    { key: "roi_extraction", label: "ROI Extraction" },
    { key: "fill_scoring", label: "Fill Scoring & Detection" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <IconSettingsAutomation className="h-4 w-4" />
          View Advanced
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-4xl max-h-[90vh] p-6">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold">
                Advanced Scan Details
              </DialogTitle>
              <DialogDescription className="text-sm">
                Pipeline visualization & quality metrics
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  ID: {scan.scan_id}
                </span>
              </DialogDescription>
            </div>

            <Badge
              variant={statusInfo.variant}
              className="flex items-center gap-1 px-2.5 py-1 text-xs"
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                  System Warnings
                </h4>

                <div className="space-y-2">
                  {warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
                    >
                      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold">
                        !
                      </div>

                      <div>
                        <p className="font-medium text-amber-900">
                          {warning.code}
                        </p>
                        <p className="text-sm text-amber-700">
                          {warning.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Metrics */}
            {qualityMetrics && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide">
                  Quality Metrics
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Blur Score",
                      value: qualityMetrics.blur_score?.toFixed(1) ?? "N/A",
                    },
                    {
                      label: "Brightness",
                      value: `${qualityMetrics.brightness_mean?.toFixed(1)} ± ${qualityMetrics.brightness_std?.toFixed(1)}`,
                    },
                    {
                      label: "Skew Angle",
                      value: `${qualityMetrics.skew_angle?.toFixed(2)}°`,
                    },
                    {
                      label: "Perspective",
                      value: qualityMetrics.perspective_correction_applied ? "Applied" : "Not Applied",
                      success: qualityMetrics.perspective_correction_applied,
                    },
                  ].map((metric, i) => (
                    <div
                      key={i}
                      className="rounded-xl border bg-muted/30 p-4"
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {metric.label}
                      </p>
                      <p
                        className={cn(
                          "text-xl font-mono font-semibold",
                          metric.success && "text-green-600"
                        )}
                      >
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Processing Time */}
            {scan.processing_time_ms && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Processing Time
                </p>
                <p className="text-2xl font-mono font-semibold">
                  {scan.processing_time_ms.toFixed(0)}ms
                </p>
              </div>
            )}

            {/* Pipeline Visualization */}
            {scan.detection_result?.pipeline_images && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide">
                  Pipeline Visualization
                </h4>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  {pipelineSteps
                    .map((step) => {
                      const imagePath =
                        scan.detection_result!.pipeline_images![step.key as keyof typeof scan.detection_result.pipeline_images];

                      if (!imagePath) return null;

                      return {
                        label: step.label,
                        imagePath,
                      };
                    })
                    .filter(Boolean)
                    .map((step, index, arr) => (
                      <div key={step!.imagePath} className="flex items-center gap-4">
                        <PipelineStep
                          label={step!.label}
                          imagePath={step!.imagePath}
                        />

                        {index < arr.length - 1 && (
                          <IconArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
