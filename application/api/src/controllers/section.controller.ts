import { Request, Response, NextFunction } from "express";
import { SectionModel } from "../models/Section.ts";
import { GradeModel } from "../models/Grade.ts";
import { Types } from "mongoose";

/**
 * Section Controller
 * Handles CRUD operations for sections
 */

export interface CreateSectionRequest {
  section_id?: string;
  name: string;
  description?: string;
  grade_id?: string;
  // capacity removed
}

export interface UpdateSectionRequest {
  name?: string;
  description?: string;
  grade_id?: string;
  // capacity removed
}

export class SectionController {
  /**
   * Create a new section
   * POST /api/sections
   */
  static async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can create sections
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const data: CreateSectionRequest = req.body;

      // If section_id provided, ensure uniqueness; otherwise auto-generate
      if (data.section_id) {
        const existing = await SectionModel.findOne({ section_id: data.section_id });
        if (existing) {
          return res.status(409).json({ error: "Section ID already exists" });
        }
      } else {
        // Generate a slug-like section_id from the name and ensure uniqueness
        const base = data.name.replace(/\s+/g, '-').toUpperCase().replace(/[^A-Z0-9\-]/g, '');
        let candidate = (base || 'SEC') + '-' + Date.now().toString().slice(-4);
        let exists = await SectionModel.findOne({ section_id: candidate });
        let idx = 1;
        while (exists) {
          candidate = `${base || 'SEC'}-${Date.now().toString().slice(-4)}${idx}`;
          exists = await SectionModel.findOne({ section_id: candidate });
          idx += 1;
        }
        data.section_id = candidate;
      }

      // Verify grade exists if provided
      if (data.grade_id) {
        const grade = await GradeModel.findById(data.grade_id);
        if (!grade) {
          return res.status(404).json({ error: "Grade not found" });
        }
      }

      const section = new SectionModel({
        ...data,
        created_by: userId,
        is_active: true
      });

      await section.save();

      res.status(201).json({
        message: "Section created successfully",
        section
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sections
   * GET /api/sections
   */
  static async listSections(req: Request, res: Response, next: NextFunction) {
    try {
      const { grade_id, page = 1, limit = 50 } = req.query;

      const query: any = { is_active: true };
      
      if (grade_id) {
        query.grade_id = grade_id;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [sections, total] = await Promise.all([
        SectionModel.find(query)
          .populate("grade_id", "grade_id name level")
          .sort({ name: 1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        SectionModel.countDocuments(query)
      ]);

      res.json({
        sections,
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
   * Get section by ID
   * GET /api/sections/:id
   */
  static async getSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const section = await SectionModel.findOne({
        _id: id,
        is_active: true
      }).populate("grade_id", "grade_id name level");

      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }

      res.json({ section });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update section
   * PUT /api/sections/:id
   */
  static async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const updates: UpdateSectionRequest = req.body;

      // Only admins can update sections
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const section = await SectionModel.findOne({
        _id: id,
        is_active: true
      });

      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }

      // Verify grade exists if being updated
      if (updates.grade_id) {
        const grade = await GradeModel.findById(updates.grade_id);
        if (!grade) {
          return res.status(404).json({ error: "Grade not found" });
        }
      }

      // Update fields
      Object.assign(section, updates);
      await section.save();

      res.json({
        message: "Section updated successfully",
        section
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete (deactivate) section
   * DELETE /api/sections/:id
   */
  static async deleteSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      // Only admins can delete sections
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const section = await SectionModel.findOne({
        _id: id,
        is_active: true
      });

      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }

      // Soft delete - set is_active to false
      section.is_active = false;
      await section.save();

      res.json({
        message: "Section deactivated successfully"
      });
    } catch (error) {
      next(error);
    }
  }
}
