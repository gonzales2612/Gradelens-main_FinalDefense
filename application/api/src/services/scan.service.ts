import { ScanModel } from "../models/Scan.ts";
import { ExamModel } from "../models/Exam.ts";
import { enqueueScan } from "../queues/scan.queue.ts";
import { regradeAfterEdit } from "./grading.service.ts";
import { Types } from "mongoose";
import { QuestionDetection } from "@packages/types/scans/scans.types.ts";

export async function createScan(
  scan_id: string,
  filename: string,
  exam_id: string | null,
  student_id: string | null,
  template_id?: string,
  redo_existing?: boolean
) {
  let actualTemplateId = template_id;

  // If exam_id provided, lookup the template_id from exam
  if (exam_id) {
    const exam = await ExamModel.findById(exam_id);
    if (!exam) {
      throw new Error(`Exam not found: ${exam_id}`);
    }

    if (!exam.template_id) {
      throw new Error(`Exam ${exam_id} does not have a template_id`);
    }

    actualTemplateId = exam.template_id;
  }

  // template_id is required either from exam or parameter
  if (!actualTemplateId) {
    throw new Error("Template is required (either from exam or parameter)");
  }

  // Handle duplicate scans for the same exam + student
  if (exam_id && student_id) {
    const existingScans = await ScanModel.find({
      exam_id: new Types.ObjectId(exam_id),
      student_id: new Types.ObjectId(student_id),
      status: { $nin: ["outdated", "failed", "error"] }
    });

    if (existingScans.length > 0) {
      if (redo_existing) {
        // Update the most recent scan, mark all others as outdated
        const existingScan = existingScans[0];
        
        // Mark all OTHER existing scans as outdated (if there are multiple)
        if (existingScans.length > 1) {
          const otherScanIds = existingScans.slice(1).map(s => s._id);
          await ScanModel.updateMany(
            { _id: { $in: otherScanIds } },
            {
              $set: { status: "outdated" },
              $push: {
                logs: {
                  timestamp: new Date(),
                  level: "info",
                  message: "Marked as outdated - multiple duplicates found, keeping most recent",
                  data: { new_scan_id: scan_id }
                }
              }
            }
          );
        }

        // Update the most recent scan with new image
        existingScan.status = "queued";
        existingScan.filename = filename;
        existingScan.scan_id = scan_id; // Use new scan_id
        existingScan.processing_started_at = new Date();
        existingScan.detection_result = null;
        existingScan.grading_result = null;
        existingScan.error_message = undefined;
        existingScan.logs.push({
          timestamp: new Date(),
          level: "info",
          message: "Scan redone - replaced with new image",
          data: { old_scan_id: existingScan.scan_id, new_scan_id: scan_id }
        });
        
        await existingScan.save();

        // Enqueue the updated scan
        await enqueueScan({
          scan_id,
          image_path: filename,
          template: actualTemplateId
        });

        return existingScan;
      } else {
        // Mark ALL existing scans as outdated
        await ScanModel.updateMany(
          {
            exam_id: new Types.ObjectId(exam_id),
            student_id: new Types.ObjectId(student_id),
            status: { $nin: ["outdated", "failed", "error"] }
          },
          {
            $set: { status: "outdated" },
            $push: {
              logs: {
                timestamp: new Date(),
                level: "info",
                message: "Marked as outdated - superseded by new scan",
                data: { new_scan_id: scan_id }
              }
            }
          }
        );
      }
    }
  }

  const scan = await ScanModel.create({
    scan_id,
    filename,
    status: "queued",
    exam_id: exam_id ? new Types.ObjectId(exam_id) : undefined,
    student_id: student_id ? new Types.ObjectId(student_id) : undefined,
    template_id: actualTemplateId,
    processing_started_at: new Date()
  });

  await enqueueScan({
    scan_id,
    image_path: filename,
    template: actualTemplateId
  });

  return scan;
}

export async function listScans(userId?: string, userRole?: string) {
  // If admin or no user provided, return all scans
  if (!userId || userRole === "admin") {
    return ScanModel.find().sort({ createdAt: -1 }).lean();
  }

  // For teachers, only return scans from their own exams
  const teacherExams = await ExamModel.find({ created_by: userId }).select("_id").lean();
  const examIds = teacherExams.map(exam => exam._id);

  return ScanModel.find({ exam_id: { $in: examIds } }).sort({ createdAt: -1 }).lean();
}

export async function getScan(scan_id: string, userId?: string, userRole?: string) {
  const scan = await ScanModel.findOne({ scan_id }).lean();
  
  if (!scan) {
    return null;
  }

  // If admin or no user provided, return the scan
  if (!userId || userRole === "admin") {
    return scan;
  }

  // For teachers, verify the scan's exam belongs to them
  if (scan.exam_id) {
    const exam = await ExamModel.findById(scan.exam_id).select("created_by").lean();
    if (exam && exam.created_by === userId) {
      return scan;
    }
  }

  // Return null if teacher doesn't own the exam
  return null;
}

export async function updateScanAnswers(
  scan_id: string,
  editedAnswers: Record<number, string[]>,
  user_id: string
) {
  const scan = await ScanModel.findOne({ scan_id });
  
  if (!scan) {
    throw new Error(`Scan not found: ${scan_id}`);
  }

  // Update detection results with edited answers
  // Only mark as manually_edited if the answer actually changed
  if (scan.detection_result && scan.detection_result.detections) {
    scan.detection_result.detections.forEach((detection: QuestionDetection) => {
      const newAnswer = editedAnswers[detection.question_id];
      if (newAnswer) {

        // Check if answer actually changed
          const currentAnswer = detection.selected || [];
          const answerChanged = 
            currentAnswer.length !== newAnswer.length ||
            !currentAnswer.every((val, idx) => val === newAnswer[idx]);

        
        if (answerChanged) {
          detection.selected = newAnswer;
          detection.manually_edited = true;
          
          // Update detection status based on the answer
          if (newAnswer.length === 1) {
            detection.detection_status = "answered";
          } else if (newAnswer.length > 1) {
            detection.detection_status = "ambiguous";
          } else {
            detection.detection_status = "unanswered";
          }
        }
      }
    });
    
    // Mark the nested object as modified so Mongoose saves it
    scan.markModified('detection_result');
  }

  // Track who edited and when
  scan.graded_by = user_id;
  scan.graded_at = new Date();

  // Re-grade the scan after manual edits
  if (scan.exam_id && scan.detection_result) {
    try {
      const gradingResult = await regradeAfterEdit(scan.detection_result, scan.exam_id);
      scan.grading_result = gradingResult;
      scan.status = gradingResult.needs_manual_review ? "needs_review" : "graded";
    } catch (error) {
      console.error(`Failed to re-grade scan ${scan_id}:`, error);
    }
  }

  // Add audit log
  scan.logs.push({
    timestamp: new Date(),
    level: "info",
    message: "Manual answer edit",
    data: { edited_by: user_id, question_count: Object.keys(editedAnswers).length }
  });

  await scan.save();

  return scan;
}

export async function markScanAsReviewed(
  scan_id: string,
  user_id: string,
  review_notes?: string
) {
  const scan = await ScanModel.findOne({ scan_id });
  
  if (!scan) {
    throw new Error(`Scan not found: ${scan_id}`);
  }

  scan.status = "graded";
  scan.reviewed_by = user_id;
  scan.reviewed_at = new Date();
  
  if (review_notes) {
    scan.review_notes = review_notes;
  }

  // Add audit log
  scan.logs.push({
    timestamp: new Date(),
    level: "info",
    message: "Marked as reviewed",
    data: { reviewed_by: user_id, has_notes: !!review_notes }
  });

  await scan.save();

  return scan;
}

export async function deleteScan(scan_id: string, userId?: string, userRole?: string) {
  const scan = await ScanModel.findOne({ scan_id });
  
  if (!scan) {
    throw new Error(`Scan not found: ${scan_id}`);
  }

  // For teachers, verify the scan's exam belongs to them
  if (userRole === "teacher" && userId) {
    if (scan.exam_id) {
      const exam = await ExamModel.findById(scan.exam_id).select("created_by").lean();
      if (!exam || exam.created_by !== userId) {
        throw new Error("Access denied: You can only delete scans from your own exams");
      }
    }
  }

  await ScanModel.deleteOne({ scan_id });
  
  return { success: true, scan_id };
}
