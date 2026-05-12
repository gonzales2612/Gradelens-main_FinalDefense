import { useCallback, useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IconCapture,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import type { Template } from "@/types/template.types";

interface LiveScannerProps {
  selectedExam?: string;
  selectedStudent?: string;
  template?: Template;
  onCapture: (imageData: string) => void;
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { min: 640, ideal: 1280, max: 1920 },
  height: { min: 480, ideal: 1920, max: 2560 },
  facingMode: "environment",
};

/** Minimum average brightness (0–255) below which the frame is considered blocked. */
const MIN_BRIGHTNESS = 30;

/** Frontend-only fiducial guide settings */
const GUIDE_INSET = 40;
const GUIDE_SIZE = 40;
const DARK_THRESHOLD = 200; // lower = darker required
const MIN_DARK_RATIO = 0.12; // % of dark pixels needed in box

/** Frontend-only paper guide settings */
const PAPER_GUIDE_SIZE = 52;
const PAPER_LIGHT_THRESHOLD = 150; // lower = easier to detect paper
const MIN_LIGHT_RATIO = 0.40; // lower = easier to detect paper

/**
 * Samples the video frame at a low resolution (64×64) and returns the
 * perceived average luminance (0–255). Very fast — safe to call every 200 ms.
 */
function getFrameBrightness(videoEl: HTMLVideoElement): number {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 255;

  ctx.drawImage(videoEl, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);

  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  return total / (data.length / 4);
}

/**
 * Detects whether each fiducial guide box contains a dark enough region.
 * This is frontend-only and checks exactly what the user sees in the preview.
 */
function detectFiducialsInOverlay(
  videoEl: HTMLVideoElement,
  overlayEl: HTMLDivElement
): boolean[] {
  const overlayRect = overlayEl.getBoundingClientRect();
  const displayW = Math.round(overlayRect.width);
  const displayH = Math.round(overlayRect.height);

  if (!displayW || !displayH || !videoEl.videoWidth || !videoEl.videoHeight) {
    return [false, false, false, false];
  }

  const canvas = document.createElement("canvas");
  canvas.width = displayW;
  canvas.height = displayH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [false, false, false, false];

  const videoW = videoEl.videoWidth;
  const videoH = videoEl.videoHeight;

  // Replicate CSS object-cover so sampling matches the on-screen preview
  const scale = Math.max(displayW / videoW, displayH / videoH);
  const drawnW = videoW * scale;
  const drawnH = videoH * scale;
  const offsetX = (displayW - drawnW) / 2;
  const offsetY = (displayH - drawnH) / 2;

  ctx.drawImage(videoEl, offsetX, offsetY, drawnW, drawnH);

  const guides = [
    { x: GUIDE_INSET, y: GUIDE_INSET, w: GUIDE_SIZE, h: GUIDE_SIZE }, // TL
    {
      x: displayW - GUIDE_INSET - GUIDE_SIZE,
      y: GUIDE_INSET,
      w: GUIDE_SIZE,
      h: GUIDE_SIZE,
    }, // TR
    {
      x: GUIDE_INSET,
      y: displayH - GUIDE_INSET - GUIDE_SIZE,
      w: GUIDE_SIZE,
      h: GUIDE_SIZE,
    }, // BL
    {
      x: displayW - GUIDE_INSET - GUIDE_SIZE,
      y: displayH - GUIDE_INSET - GUIDE_SIZE,
      w: GUIDE_SIZE,
      h: GUIDE_SIZE,
    }, // BR
  ];

  return guides.map(({ x, y, w, h }) => {
    const imageData = ctx.getImageData(x, y, w, h).data;

    let darkPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luminance < DARK_THRESHOLD) darkPixels++;
      totalPixels++;
    }

    const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0;
    return darkRatio >= MIN_DARK_RATIO;
  });
}

/**
 * Detects whether paper guide boxes contain enough light pixels.
 * Same idea as fiducial detection, but it checks for lightness instead of darkness.
 */
function detectPaperGuidesInOverlay(
  videoEl: HTMLVideoElement,
  overlayEl: HTMLDivElement
): boolean[] {
  const overlayRect = overlayEl.getBoundingClientRect();
  const displayW = Math.round(overlayRect.width);
  const displayH = Math.round(overlayRect.height);

  if (!displayW || !displayH || !videoEl.videoWidth || !videoEl.videoHeight) {
    return [false, false, false, false];
  }

  const canvas = document.createElement("canvas");
  canvas.width = displayW;
  canvas.height = displayH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [false, false, false, false];

  const videoW = videoEl.videoWidth;
  const videoH = videoEl.videoHeight;

  // Replicate CSS object-cover so sampling matches the on-screen preview
  const scale = Math.max(displayW / videoW, displayH / videoH);
  const drawnW = videoW * scale;
  const drawnH = videoH * scale;
  const offsetX = (displayW - drawnW) / 2;
  const offsetY = (displayH - drawnH) / 2;

  ctx.drawImage(videoEl, offsetX, offsetY, drawnW, drawnH);

  const centerX = displayW / 2;
  const centerY = displayH / 2;

  const guides = [
    {
      x: centerX - PAPER_GUIDE_SIZE / 2,
      y: 100,
      w: PAPER_GUIDE_SIZE,
      h: PAPER_GUIDE_SIZE,
    }, // top paper area
    {
      x: displayW - 100 - PAPER_GUIDE_SIZE,
      y: centerY - PAPER_GUIDE_SIZE / 2,
      w: PAPER_GUIDE_SIZE,
      h: PAPER_GUIDE_SIZE,
    }, // right paper area
    {
      x: centerX - PAPER_GUIDE_SIZE / 2,
      y: displayH - 100 - PAPER_GUIDE_SIZE,
      w: PAPER_GUIDE_SIZE,
      h: PAPER_GUIDE_SIZE,
    }, // bottom paper area
    {
      x: 100,
      y: centerY - PAPER_GUIDE_SIZE / 2,
      w: PAPER_GUIDE_SIZE,
      h: PAPER_GUIDE_SIZE,
    }, // left paper area
  ];

  return guides.map(({ x, y, w, h }) => {
    const imageData = ctx.getImageData(x, y, w, h).data;

    let lightPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luminance > PAPER_LIGHT_THRESHOLD) lightPixels++;
      totalPixels++;
    }

    const lightRatio = totalPixels > 0 ? lightPixels / totalPixels : 0;
    return lightRatio >= MIN_LIGHT_RATIO;
  });
}

/**
 * Captures what the user actually sees in the preview — i.e. the portrait-cropped
 * centre of the video frame — instead of the raw landscape video frame.
 */
function capturePortraitFrame(
  videoEl: HTMLVideoElement,
  quality = 0.92
): string | null {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh) return null;

  const TARGET_RATIO = 3 / 4; // width / height

  let srcX = 0;
  let srcY = 0;
  let srcW = vw;
  let srcH = vh;

  const videoRatio = vw / vh;

  if (videoRatio > TARGET_RATIO) {
    srcW = Math.round(vh * TARGET_RATIO);
    srcX = Math.round((vw - srcW) / 2);
  } else {
    srcH = Math.round(vw / TARGET_RATIO);
    srcY = Math.round((vh - srcH) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = srcW;
  canvas.height = srcH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(videoEl, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}

export function LiveScanner({
  selectedExam,
  selectedStudent,
  template,
  onCapture,
}: LiveScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previewIntervalRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [detectedMarks, setDetectedMarks] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [detectedPaperGuides, setDetectedPaperGuides] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [isCameraBlocked, setIsCameraBlocked] = useState(false);

  useEffect(() => {
    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
      }
    };
  }, []);

  const stopPreview = useCallback(() => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
  }, []);

  const startPreview = useCallback(() => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
    }

    previewIntervalRef.current = window.setInterval(() => {
      const video = webcamRef.current?.video;
      const overlay = overlayRef.current;
      if (!video || !overlay) return;

      const brightness = getFrameBrightness(video);
      if (brightness < MIN_BRIGHTNESS) {
        setDetectedMarks([false, false, false, false]);
        setDetectedPaperGuides([false, false, false, false]);
        setIsCameraBlocked(true);
        return;
      }

      setIsCameraBlocked(false);

      const paperDetected = detectPaperGuidesInOverlay(video, overlay);
      setDetectedPaperGuides(paperDetected);

      const localDetected = detectFiducialsInOverlay(video, overlay);
      setDetectedMarks(localDetected);
    }, 200);
  }, []);

  useEffect(() => {
    if (isReady) {
      startPreview();
      return () => stopPreview();
    }
  }, [isReady, startPreview, stopPreview]);

  const handleCapture = useCallback(async () => {
    const video = webcamRef.current?.video;
    const overlay = overlayRef.current;
    if (!video || !overlay || !selectedExam || !selectedStudent || isCapturing) {
      return;
    }

    const brightness = getFrameBrightness(video);
    if (brightness < MIN_BRIGHTNESS) {
      toast.warning("Camera appears blocked", {
        description: "Please uncover the camera before capturing",
        duration: 3000,
      });
      return;
    }

    const paperDetected = detectPaperGuidesInOverlay(video, overlay);
    setDetectedPaperGuides(paperDetected);

    if (!paperDetected.every(Boolean)) {
      toast.warning("Paper not aligned", {
        description: "Move the paper until all white paper guides turn green",
        duration: 2500,
      });
      return;
    }

    const localDetected = detectFiducialsInOverlay(video, overlay);
    setDetectedMarks(localDetected);

    if (!localDetected.every(Boolean)) {
      toast.warning("Align all fiducials first", {
        description: "Move the paper until all four fiducial boxes turn green",
        duration: 2500,
      });
      return;
    }

    setIsCapturing(true);

    try {
      const base64Data = capturePortraitFrame(video);
      if (!base64Data) throw new Error("Failed to capture frame from camera");

      toast.info("Capturing scan...", {
        description: "Processing your scan",
        duration: 2000,
      });

      await onCapture(base64Data);

      toast.success("Scan captured!", {
        description: "Added to queue for processing",
        duration: 2000,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.error("Capture error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to capture scan";
      setError(errorMessage);
      toast.error("Capture failed", {
        description: errorMessage,
        duration: 3000,
      });
    } finally {
      setIsCapturing(false);
    }
  }, [selectedExam, selectedStudent, onCapture, isCapturing]);

  const handleUserMedia = useCallback(() => {
    setIsReady(true);
    setError("");
  }, []);

  const handleUserMediaError = useCallback((err: string | DOMException) => {
    setIsReady(false);
    const errorMessage =
      typeof err === "string" ? err : err.message || "Failed to access camera";
    setError(errorMessage);
    console.error("Camera error:", err);
  }, []);

  const allFiducialsDetected = detectedMarks.every(Boolean);
  const allPaperGuidesDetected = detectedPaperGuides.every(Boolean);

  const canCapture =
    !!selectedExam &&
    !!selectedStudent &&
    isReady &&
    !isCapturing &&
    !isCameraBlocked &&
    allPaperGuidesDetected &&
    allFiducialsDetected;

  const alertMessage = (() => {
    if (!selectedExam) return "Please select an exam before scanning";
    if (selectedExam && !template) {
      return "Please select an assessment to load the template guide";
    }
    if (!selectedStudent) return "Please select a student before scanning";
    if (!allPaperGuidesDetected) {
      return "Align the paper inside the light guide boxes";
    }
    if (!allFiducialsDetected) {
      return "Align all four fiducial markers to the corners";
    }
    return null;
  })();

  const fiducials = [
    { id: "tl", label: "TL", top: "40px", left: "40px" },
    { id: "tr", label: "TR", top: "40px", right: "40px" },
    { id: "bl", label: "BL", bottom: "40px", left: "40px" },
    { id: "br", label: "BR", bottom: "40px", right: "40px" },
  ];

  const paperGuides = [
    {
      id: "paper-top",
      label: "PAPER",
      top: "100px",
      left: "50%",
      transform: "translateX(-50%)",
    },
    {
      id: "paper-right",
      label: "PAPER",
      top: "50%",
      right: "100px",
      transform: "translateY(-50%)",
    },
    {
      id: "paper-bottom",
      label: "PAPER",
      bottom: "100px",
      left: "50%",
      transform: "translateX(-50%)",
    },
    {
      id: "paper-left",
      label: "PAPER",
      top: "50%",
      left: "100px",
      transform: "translateY(-50%)",
    },
  ];

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="rounded-lg border border-gray-700 bg-gray-950 overflow-hidden">
        <div className="relative aspect-3/4 w-full overflow-hidden bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={VIDEO_CONSTRAINTS}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            className="h-full w-full object-cover"
            mirrored={false}
          />

          <div ref={overlayRef} className="absolute inset-0">
            {paperGuides.map((guide, idx) => (
              <div
                key={guide.id}
                className="absolute transition-all duration-200"
                style={{
                  top: guide.top,
                  bottom: guide.bottom,
                  left: guide.left,
                  right: guide.right,
                  transform: guide.transform,
                  width: `${PAPER_GUIDE_SIZE}px`,
                  height: `${PAPER_GUIDE_SIZE}px`,
                }}
              >
                <svg viewBox="0 0 52 52" fill="none" className="w-full h-full">
                  <rect
                    x="1.5"
                    y="1.5"
                    width="49"
                    height="49"
                    rx="8"
                    fill={
                      detectedPaperGuides[idx]
                        ? "rgba(34, 197, 94, 0.20)"
                        : "rgba(250, 204, 21, 0.13)"
                    }
                    stroke={detectedPaperGuides[idx] ? "#22c55e" : "#facc15"}
                    strokeWidth={detectedPaperGuides[idx] ? "2" : "1.5"}
                    strokeDasharray="5 4"
                  />
                </svg>
              </div>
            ))}

            {fiducials.map((fid, idx) => (
              <div
                key={fid.id}
                className="absolute transition-all duration-200"
                style={{
                  top: fid.top,
                  bottom: fid.bottom,
                  left: fid.left,
                  right: fid.right,
                  width: `${GUIDE_SIZE}px`,
                  height: `${GUIDE_SIZE}px`,
                }}
              >
                <svg viewBox="0 0 44 44" fill="none" className="w-full h-full">
                  <rect
                    x="1.5"
                    y="1.5"
                    width="41"
                    height="41"
                    rx="7"
                    fill={
                      detectedMarks[idx]
                        ? "rgba(34, 197, 94, 0.25)"
                        : "rgba(59, 130, 246, 0.13)"
                    }
                    stroke={detectedMarks[idx] ? "#22c55e" : "#3b82f6"}
                    strokeWidth={detectedMarks[idx] ? "2" : "1.5"}
                  />
                </svg>
              </div>
            ))}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className="bg-gray-900 border border-gray-700 rounded-full px-3 py-1">
                <p className="text-gray-400 text-xs">
                  {allPaperGuidesDetected && allFiducialsDetected
                    ? "✓ Paper and fiducials aligned"
                    : !allPaperGuidesDetected
                    ? "align paper to yellow guides"
                    : "align fiducials to corners"}
                </p>
              </div>
            </div>
          </div>

          {isCapturing && (
            <div
              className="absolute inset-0 bg-white animate-pulse pointer-events-none"
              style={{
                animationDuration: "300ms",
                animationIterationCount: "1",
              }}
            />
          )}

          {isCameraBlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 pointer-events-none gap-2">
              <IconAlertCircle className="h-8 w-8 text-yellow-400" />
              <p className="text-yellow-400 text-xs font-medium">
                Camera blocked or too dark
              </p>
            </div>
          )}

          {allPaperGuidesDetected &&
            allFiducialsDetected &&
            !isCapturing &&
            !isCameraBlocked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-green-500 p-4 shadow-lg animate-pulse">
                  <IconCheck className="h-12 w-12 text-white" />
                </div>
              </div>
            )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isCameraBlocked && (
        <Alert variant="destructive">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>
            Camera appears blocked or too dark — uncover the lens to continue
          </AlertDescription>
        </Alert>
      )}

      {alertMessage && (
        <Alert>
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={handleCapture}
        disabled={!canCapture}
        className={`w-full text-gray-900 size-lg ${
          allPaperGuidesDetected && allFiducialsDetected
            ? "bg-green-500 hover:bg-green-600"
            : "bg-white hover:bg-gray-100"
        }`}
        size="lg"
      >
        <IconCapture className="mr-2 h-5 w-5" />
        {allPaperGuidesDetected && allFiducialsDetected
          ? "Ready to Capture"
          : !allPaperGuidesDetected
          ? "Align Paper"
          : "Align Fiducials"}
      </Button>
    </div>
  );
}