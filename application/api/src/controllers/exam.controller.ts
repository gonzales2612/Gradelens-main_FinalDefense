import { Request, Response, NextFunction } from "express";
import { ExamModel } from "../models/Exam.ts";
import { ClassModel } from "../models/Class.ts";
import { ScanModel } from "../models/Scan.ts";
import type { CreateExamRequest, UpdateExamRequest } from "../types/exam.types.ts";
import { Types } from "mongoose";

/**
 * Exam Controller
 * Handles CRUD operations for exams/exams
 */

export class ExamController {
  /**
   * Create a new exam
   * POST /api/exams
   */
  static async createExam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data: CreateExamRequest = req.body;

      // Auto-generate exam_id if not provided
      if (!data.exam_id) {
        const base = data.name.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
        let candidate = base || `EXAM${Date.now().toString().slice(-5)}`;
        let exists = await ExamModel.findOne({ exam_id: candidate });
        let idx = 1;
        while (exists) {
          candidate = `${base || 'EXAM'}${Date.now().toString().slice(-5)}${idx}`;
          exists = await ExamModel.findOne({ exam_id: candidate });
          idx += 1;
        }
        data.exam_id = candidate;
      } else {
        // Check if exam_id already exists when provided
        const existing = await ExamModel.findOne({ exam_id: data.exam_id });
        if (existing) {
          return res.status(409).json({ error: "Exam ID already exists" });
        }
      }

      // Verify class exists if provided
      if (data.class_id) {
        const classDoc = await ClassModel.findById(data.class_id);
        if (!classDoc) {
          return res.status(404).json({ error: "Class not found" });
        }
      }

      const exam = new ExamModel({
        ...data,
        created_by: userId,
        status: "draft",
        is_active: true,
        grading_policy: data.grading_policy || {
          partial_credit: false,
          penalty_incorrect: 0,
          require_manual_review_on_ambiguity: true
        }
      });

      await exam.save();

      res.status(201).json({
        message: "Exam created successfully",
        exam
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all exams
   * GET /api/exams
   */
  static async listExams(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { status, class_id, template_id, page = 1, limit = 50 } = req.query;

      const query: any = { is_active: true };
      
      // Teachers can only see their own exams, admins see all
      if (userRole === "teacher") {
        query.created_by = userId;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (class_id) {
        query.class_id = class_id;
      }

      if (template_id) {
        query.template_id = template_id;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [exams, total] = await Promise.all([
        ExamModel.find(query)
          .populate("class_id", "class_id name student_count")
          .sort({ scheduled_date: -1, createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        ExamModel.countDocuments(query)
      ]);

      res.json({
        exams,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exam by ID
   * GET /api/exams/:id
   */
  static async getExam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const query: any = { _id: id, is_active: true };
      
      // Teachers can only access their own exams, admins can access all
      if (userRole === "teacher") {
        query.created_by = userId;
      }

      const exam = await ExamModel.findOne(query)
        .populate("class_id", "class_id name academic_year student_count");

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      res.json({ exam });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update exam
   * PUT /api/exams/:id
   */
  static async updateExam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const updates: UpdateExamRequest = req.body;

      const query: any = { _id: id, is_active: true };
      
      // Teachers can only update their own exams, admins can update all
      if (userRole === "teacher") {
        query.created_by = userId;
      }

      const exam = await ExamModel.findOne(query);

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      // Verify class exists if being updated
      if (updates.class_id) {
        const classDoc = await ClassModel.findById(updates.class_id);
        if (!classDoc) {
          return res.status(404).json({ error: "Class not found" });
        }
      }

      // Update fields
      Object.assign(exam, updates);
      await exam.save();

      res.json({
        message: "Exam updated successfully",
        exam
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete (deactivate) exam
   * DELETE /api/exams/:id
   */
  static async deleteExam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const query: any = { _id: id, is_active: true };
      
      // Teachers can only delete their own exams, admins can delete all
      if (userRole === "teacher") {
        query.created_by = userId;
      }

      const exam = await ExamModel.findOne(query);

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      // Soft delete - set is_active to false and status to archived
      exam.is_active = false;
      exam.status = "archived";
      await exam.save();

      res.json({
        message: "Exam archived successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update exam status
   * PATCH /api/exams/:id/status
   */
  static async updateExamStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!["draft", "active", "completed", "archived"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const query: any = { _id: id, is_active: true };
      
      // Teachers can only update status of their own exams, admins can update all
      if (userRole === "teacher") {
        query.created_by = userId;
      }

      const exam = await ExamModel.findOne(query);

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      exam.status = status;
      if (status === "archived") {
        exam.is_active = false;
      }
      await exam.save();

      res.json({
        message: "Exam status updated successfully",
        exam
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exam statistics
   * GET /api/exams/:id/statistics
   */
  static async getExamStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const exam = await ExamModel.findOne({
        _id: id,
        created_by: userId,
        is_active: true
      });

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      // Get all scans for this exam
      const scans = await ScanModel.find({ exam_id: exam._id });

      const totalScans = scans.length;
      const gradedScans = scans.filter(s => s.status === "graded").length;
      const needsReview = scans.filter(s => s.status === "needs_review").length;

      // Calculate score statistics
      const scores = scans
        .filter(s => s.grading_result?.score !== undefined)
        .map(s => s.grading_result.score);

      const averageScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      const averagePercentage = exam.total_points! > 0
        ? (averageScore / exam.total_points!) * 100
        : 0;

      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      // Calculate completion rate
      let completionRate = 0;
      if (exam.class_id) {
        const classDoc = await ClassModel.findById(exam.class_id);
        if (classDoc && classDoc.student_ids.length > 0) {
          completionRate = (totalScans / classDoc.student_ids.length) * 100;
        }
      }

      res.json({
        exam_id: exam._id,
        total_scans: totalScans,
        graded_scans: gradedScans,
        needs_review: needsReview,
        average_score: averageScore,
        average_percentage: averagePercentage,
        highest_score: highestScore,
        lowest_score: lowestScore,
        completion_rate: completionRate
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scans for exam
   * GET /api/exams/:id/scans
   */
  static async getExamScans(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { status, page = 1, limit = 50 } = req.query;

      const exam = await ExamModel.findOne({
        _id: id,
        created_by: userId,
        is_active: true
      });

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      const query: any = { exam_id: exam._id };
      if (status) {
        query.status = status;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [scans, total] = await Promise.all([
        ScanModel.find(query)
          .populate("student_id", "student_id first_name last_name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        ScanModel.countDocuments(query)
      ]);

      res.json({
        scans,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  }
}
