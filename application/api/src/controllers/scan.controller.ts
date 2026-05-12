import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";
import { createScan, listScans, getScan, updateScanAnswers, markScanAsReviewed, deleteScan } from "../services/scan.service.ts";
import { ExamModel } from "../models/Exam.ts";

const STORAGE_DIR = process.env.SCAN_STORAGE_DIR || "/data/scans";

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export async function uploadScan(req: Request, res: Response) {
  try {
    const { image, exam_id, student_id, redo_existing } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!image) {
      return res.status(400).json({ error: "Image is required" });
    }
    if (!exam_id) {
      return res.status(400).json({ error: "exam_id is required" });
    }
    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }

    // Verify exam ownership for teachers
    if (userRole === "teacher") {
      const exam = await ExamModel.findById(exam_id);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      if (exam.created_by !== userId) {
        return res.status(403).json({ error: "Access denied: You can only upload scans for your own exams" });
      }
    }

    const scan_id = uuid();
    const filename = `${scan_id}.jpg`;
    const filePath = path.join(STORAGE_DIR, filename);

    fs.writeFileSync(filePath, image, "base64");

    const scan = await createScan(scan_id, filename, exam_id, student_id, undefined, redo_existing);

    res.status(202).json(scan);
  } catch (error) {
    console.error("Upload scan error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to upload scan" 
    });
  }
}

/**
 * Upload answer key scan (no exam_id or student_id required)
 * Used for scanning answer keys before exam creation
 */
export async function uploadAnswerKeyScan(req: Request, res: Response) {
  try {
    const { image, template_id } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image is required" });
    }
    if (!template_id) {
      return res.status(400).json({ error: "template_id is required" });
    }

    const scan_id = uuid();
    const filename = `${scan_id}.jpg`;
    const filePath = path.join(STORAGE_DIR, filename);

    fs.writeFileSync(filePath, image, "base64");

    const scan = await createScan(scan_id, filename, null, null, template_id);

    res.status(202).json(scan);
  } catch (error) {
    console.error("Upload answer key scan error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to upload answer key scan" 
    });
  }
}

export async function getScans(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;
  
  const scans = await listScans(userId, userRole);
  res.json(scans);
}

export async function getScanById(req: Request, res: Response) {
  const scan_id = Array.isArray(req.params.scan_id) ? req.params.scan_id[0] : req.params.scan_id;
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;
  
  const scan = await getScan(scan_id, userId, userRole);
  if (!scan) return res.sendStatus(404);
  res.json(scan);
}

export async function updateScanAnswersController(req: Request, res: Response) {
  try {
    const scan_id = Array.isArray(req.params.scan_id) ? req.params.scan_id[0] : req.params.scan_id;
    const { answers } = req.body;
    const user_id = (req as any).user?.id || (req as any).user?._id || "unknown";
    const userRole = (req as any).user?.role;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "answers is required and must be an object" });
    }

    // Verify exam ownership for teachers before allowing edit
    if (userRole === "teacher") {
      const existingScan = await getScan(scan_id, user_id, userRole);
      if (!existingScan) {
        return res.status(404).json({ error: "Scan not found" });
      }
    }

    const scan = await updateScanAnswers(scan_id, answers, user_id);

    res.json({
      scan_id: scan.scan_id,
      status: scan.status,
      graded_by: scan.graded_by,
      graded_at: scan.graded_at,
      grading_result: scan.grading_result
    });
  } catch (error) {
    console.error("Update scan answers error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message.includes("cannot be edited")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to update scan answers" 
    });
  }
}

// review_notes is optional, it is not being passed from the frontend currently. (01-27-26)
export async function markAsReviewedController(req: Request, res: Response) {
  try {
    const scan_id = Array.isArray(req.params.scan_id) ? req.params.scan_id[0] : req.params.scan_id;
    const { review_notes } = req.body;
    const user_id = (req as any).user?.id || (req as any).user?._id || "unknown";
    const userRole = (req as any).user?.role;

    // Verify exam ownership for teachers before allowing review
    if (userRole === "teacher") {
      const existingScan = await getScan(scan_id, user_id, userRole);
      if (!existingScan) {
        return res.status(404).json({ error: "Scan not found" });
      }
    }

    const scan = await markScanAsReviewed(scan_id, user_id, review_notes);

    res.json({
      scan_id: scan.scan_id,
      status: scan.status,
      reviewed_by: scan.reviewed_by,
      reviewed_at: scan.reviewed_at
    });
  } catch (error) {
    console.error("Mark as reviewed error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to mark scan as reviewed" 
    });
  }
}

export async function deleteScanController(req: Request, res: Response) {
  try {
    const scan_id = Array.isArray(req.params.scan_id) ? req.params.scan_id[0] : req.params.scan_id;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Verify scan exists and user has access
    const existingScan = await getScan(scan_id, userId, userRole);
    if (!existingScan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    await deleteScan(scan_id, userId, userRole);

    res.json({ message: "Scan deleted successfully", scan_id });
  } catch (error) {
    console.error("Delete scan error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to delete scan" 
    });
  }
}
