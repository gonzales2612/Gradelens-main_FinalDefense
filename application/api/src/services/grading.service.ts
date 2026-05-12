import type { DetectionResult } from "@packages/types/scans/scans.types.ts";
import type { GradingResult, QuestionGrade } from "@packages/types/scans/scans.types.ts";
import type { Answer } from "../types/answer_key.types.ts";
import { ExamModel, type ExamDocument } from "../models/Exam.ts";
import type { Types } from "mongoose";

/**
 * Grading Service
 * 
 * Compares detection results with answer keys to calculate grades.
 * This is where business logic (grading decisions) happens, separate from CV facts.
 */

export async function gradeDetectionResult(
  detectionResult: DetectionResult,
  exam_id: Types.ObjectId
): Promise<GradingResult> {
  // Fetch the exam with answer key
  const exam = await ExamModel.findById(exam_id) as ExamDocument | null;
  
  if (!exam) {
    throw new Error(`Exam not found: ${exam_id}`);
  }

  const answerKey = exam.toAnswerKey();
  const answers: Answer[] = answerKey.answers;
  const gradingPolicy = answerKey.grading_policy;

  // Initialize grading result
  let points_earned = 0;
  let points_possible = 0;
  let correct_count = 0;
  let incorrect_count = 0;
  let unanswered_count = 0;
  let ambiguous_count = 0;
  const grades: QuestionGrade[] = [];

  // Grade each question
  for (const detection of detectionResult.detections) {
    const answerInfo = answers.find((a: Answer) => a.question_id === detection.question_id);
    
    if (!answerInfo) {
      continue; // Skip if no answer key for this question
    }

    const student_answer = detection.selected || [];
    const correct_answer = answerInfo.correct;
    const question_points = answerInfo.points || 1;
    
    points_possible += question_points;

    // Determine correctness
    let is_correct: boolean | null = null;
    let earned = 0;
    let requires_review = false;
    let review_reason: "ambiguous" | "unanswered" | "low_confidence" | "multiple_marks" | undefined;
    
    if (detection.detection_status === "ambiguous") {
      is_correct = null;
      requires_review = true;
      review_reason = "ambiguous";
      ambiguous_count++;
    } else if (student_answer.length === 0) {
      is_correct = false;
      unanswered_count++;
    } else {
      is_correct = student_answer.length === 1 && student_answer[0] === correct_answer;
      if (is_correct) {
        earned = question_points;
        correct_count++;
      } else {
        incorrect_count++;
        // Apply penalty if configured
        if (gradingPolicy?.penalty_incorrect) {
          earned = -gradingPolicy.penalty_incorrect;
        }
      }
    }

    points_earned += earned;

    grades.push({
      question_id: detection.question_id,
      detected: student_answer,
      correct_answer,
      is_correct,
      points_earned: earned,
      points_possible: question_points,
      requires_review,
      review_reason
    });
  }

  console.log("========== GRADE DEBUG START ==========");
  console.log("Exam ID:", exam_id.toString());
  console.log("Scan ID:", detectionResult.scan_id);
  console.log("Detection status:", detectionResult.status);
  console.log("Detection count:", detectionResult.detections?.length);
  console.log("Detections:", JSON.stringify(detectionResult.detections, null, 2));

  // Calculate percentage
  const percentage = points_possible > 0 ? (points_earned / points_possible) * 100 : 0;

  // Determine if manual review is needed
  const needs_manual_review = 
    (gradingPolicy?.require_manual_review_on_ambiguity && ambiguous_count > 0) ||
    detectionResult.status === "needs_review";

  return {
    scan_id: detectionResult.scan_id || "",
    exam_id: exam_id.toString(),
    status: needs_manual_review ? "needs_review" : "graded",
    grades,
    score: {
      points_earned: Math.max(0, points_earned),
      points_possible,
      percentage,
      correct_count,
      incorrect_count,
      unanswered_count,
      ambiguous_count
    },
    needs_manual_review,
    graded_at: new Date().toISOString(),
    graded_by: "system"
  };
}



/**
 * Re-grade a scan after manual answer edits
 */
export async function regradeAfterEdit(
  detectionResult: DetectionResult,
  exam_id: Types.ObjectId
): Promise<GradingResult> {
  // Same logic as gradeDetectionResult, just exposed separately for clarity
  return gradeDetectionResult(detectionResult, exam_id);
}
