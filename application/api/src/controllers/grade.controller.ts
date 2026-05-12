import { Request, Response, NextFunction } from "express";
import { GradeModel } from "../models/Grade.ts";
import type { Types } from "mongoose";

/**
 * Grade Controller
 * Handles CRUD operations for grades
 */

export interface CreateGradeRequest {
  grade_id?: string;
  name: string;
  level: number;
  description?: string;
}

export interface UpdateGradeRequest {
  name?: string;
  level?: number;
  description?: string;
}

export class GradeController {
  /**
   * Create a new grade
   * POST /api/grades
   */
  static async createGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can create grades
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const data: CreateGradeRequest = req.body;

      // Auto-generate grade_id if not provided
      if (!data.grade_id) {
        const base = data.name.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
        let candidate = base || `G${Date.now().toString().slice(-4)}`;
        // Ensure uniqueness
        let exists = await GradeModel.findOne({ grade_id: candidate });
        let idx = 1;
        while (exists) {
          candidate = `${base || 'G'}${Date.now().toString().slice(-4)}${idx}`;
          exists = await GradeModel.findOne({ grade_id: candidate });
          idx += 1;
        }
        data.grade_id = candidate;
      } else {
        // Check if grade_id already exists when provided
        const existingId = await GradeModel.findOne({ grade_id: data.grade_id });
        if (existingId) {
          return res.status(409).json({ error: "Grade ID already exists" });
        }
      }

      // Check if level already exists
      const existingLevel = await GradeModel.findOne({ level: data.level });
      if (existingLevel) {
        return res.status(409).json({ error: "Grade level already exists" });
      }

      const grade = new GradeModel({
        ...data,
        created_by: userId,
        is_active: true
      });

      await grade.save();

      res.status(201).json({
        message: "Grade created successfully",
        grade
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all grades
   * GET /api/grades
   */
  static async listGrades(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const query: any = { is_active: true };
      const skip = (Number(page) - 1) * Number(limit);

      const [grades, total] = await Promise.all([
        GradeModel.find(query)
          .sort({ level: 1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        GradeModel.countDocuments(query)
      ]);

      res.json({
        grades,
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
   * Get grade by ID
   * GET /api/grades/:id
   */
  static async getGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const grade = await GradeModel.findOne({
        _id: id,
        is_active: true
      });

      if (!grade) {
        return res.status(404).json({ error: "Grade not found" });
      }

      res.json({ grade });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update grade
   * PUT /api/grades/:id
   */
  static async updateGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const updates: UpdateGradeRequest = req.body;

      // Only admins can update grades
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const grade = await GradeModel.findOne({
        _id: id,
        is_active: true
      });

      if (!grade) {
        return res.status(404).json({ error: "Grade not found" });
      }

      // Check if level is being updated and conflicts
      if (updates.level && updates.level !== grade.level) {
        const existingLevel = await GradeModel.findOne({ 
          level: updates.level,
          _id: { $ne: id }
        });
        if (existingLevel) {
          return res.status(409).json({ error: "Grade level already exists" });
        }
      }

      // Update fields
      Object.assign(grade, updates);
      await grade.save();

      res.json({
        message: "Grade updated successfully",
        grade
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete (deactivate) grade
   * DELETE /api/grades/:id
   */
  static async deleteGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      // Only admins can delete grades
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const grade = await GradeModel.findOne({
        _id: id,
        is_active: true
      });

      if (!grade) {
        return res.status(404).json({ error: "Grade not found" });
      }

      // Soft delete - set is_active to false
      grade.is_active = false;
      await grade.save();

      res.json({
        message: "Grade deactivated successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}
