import { Request, Response, NextFunction } from "express";
import { ClassModel } from "../models/Class.ts";
import { StudentModel } from "../models/Student.ts";
import type { CreateClassRequest, UpdateClassRequest } from "../types/class.types.ts";
import { Types } from "mongoose";
import { ClassStudentSyncService } from "../services/classStudentSync.service.ts";

/**
 * Class Controller
 * Handles CRUD operations for classes and student assignments
 */

export class ClassController {
  /**
   * Create a new class
   * POST /api/classes
   */
  static async createClass(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only admins can create classes
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const data: CreateClassRequest = req.body;

      // Check if class_id already exists
      const existing = await ClassModel.findOne({ class_id: data.class_id });
      if (existing) {
        return res.status(409).json({ error: "Class ID already exists" });
      }

      const classDoc = new ClassModel({
        ...data,
        teacher_id: userId,
        created_by: userId,
        status: "active",
        student_ids: [], // Initialize empty, will be added via sync service
        section_ids: data.section_ids && data.section_ids.length > 0
          ? data.section_ids.map(id => typeof id === 'string' ? new Types.ObjectId(id) : id)
          : []
      });

      await classDoc.save();

      // Add students using sync service (maintains bidirectional relationship)
      if (data.student_ids && data.student_ids.length > 0) {
        const studentObjectIds = data.student_ids.map(id => 
          typeof id === 'string' ? new Types.ObjectId(id) : id
        );
        await ClassStudentSyncService.addStudentsToClass(classDoc._id, studentObjectIds);
      }

      res.status(201).json({
        message: "Class created successfully",
        class: classDoc
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all classes
   * GET /api/classes
   */
  static async listClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status, academic_year, page = 1, limit = 50 } = req.query;

      const query: any = {};
      
      if (status) {
        query.status = status;
      }
      
      if (academic_year) {
        query.academic_year = academic_year;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [classes, total] = await Promise.all([
        ClassModel.find(query)
          .sort({ academic_year: -1, name: 1 })
          .skip(skip)
          .limit(Number(limit)),
        ClassModel.countDocuments(query)
      ]);

      res.json({
        classes,
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
   * Get class by ID with populated students
   * GET /api/classes/:id
   */
  static async getClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { populate_students } = req.query;

      let query = ClassModel.findById(id);

      if (populate_students === "true") {
        query = query.populate("student_ids", "student_id first_name last_name email status");
      }

      const classDoc = await query;

      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      res.json({ class: classDoc });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update class
   * PUT /api/classes/:id
   */
  static async updateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const updates: UpdateClassRequest = req.body;

      // Only admins can update classes
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const classDoc = await ClassModel.findById(id);

      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      // If student_ids are being updated, use sync service
      if (updates.student_ids) {
        // Convert string IDs to ObjectIds
        const studentObjectIds = updates.student_ids.map(id => 
          typeof id === 'string' ? new Types.ObjectId(id) : id
        );
        
        const result = await ClassStudentSyncService.updateClassStudents(
          classDoc._id,
          studentObjectIds
        );
        
        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }
        
        // Remove student_ids from updates as it's already handled
        delete updates.student_ids;
      }

      // If section_ids are being updated, assign them (no sync service required)
      if (updates.section_ids) {
        const sectionObjectIds = updates.section_ids.map(id =>
          typeof id === 'string' ? new Types.ObjectId(id) : id
        );
        classDoc.section_ids = sectionObjectIds;
        // remove from updates so Object.assign doesn't overwrite with raw values
        delete updates.section_ids;
      }

      // Update remaining fields
      Object.assign(classDoc, updates);
      await classDoc.save();

      // Fetch updated class to get current student_ids
      const updatedClass = await ClassModel.findById(id);

      res.json({
        message: "Class updated successfully",
        class: updatedClass
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete (archive) class
   * DELETE /api/classes/:id
   */
  static async deleteClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Only admins can delete classes
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const classDoc = await ClassModel.findById(id);

      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Remove class from all students before archiving
      await ClassStudentSyncService.removeClassFromAllStudents(classDoc._id);

      // Soft delete - set status to archived
      classDoc.status = "archived";
      await classDoc.save();

      res.json({
        message: "Class archived successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add student to class
   * POST /api/classes/:id/students
   */
  static async addStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { student_id } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Only admins can add students to classes
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      if (!student_id) {
        return res.status(400).json({ error: "student_id is required" });
      }

      const [classDoc, student] = await Promise.all([
        ClassModel.findById(id),
        StudentModel.findById(student_id)
      ]);

      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Add student to class using sync service
      const studentObjectId = typeof student_id === 'string' 
        ? new Types.ObjectId(student_id) 
        : student_id;
      
      const result = await ClassStudentSyncService.addStudentToClass(
        classDoc._id,
        studentObjectId
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Fetch updated class
      const updatedClass = await ClassModel.findById(id);

      res.json({
        message: "Student added to class successfully",
        class: updatedClass
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove student from class
   * DELETE /api/classes/:id/students/:studentId
   */
  static async removeStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, studentId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Only admins can remove students from classes
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const studentIdStr = Array.isArray(studentId) ? studentId[0] : studentId;

      const [classDoc, student] = await Promise.all([
        ClassModel.findById(id),
        StudentModel.findById(studentIdStr)
      ]);

      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Remove student from class using sync service
      const studentObjectId = typeof studentIdStr === 'string'
        ? new Types.ObjectId(studentIdStr)
        : studentIdStr;
      
      const result = await ClassStudentSyncService.removeStudentFromClass(
        classDoc._id,
        studentObjectId
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: "Student removed from class successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get students in class
   * GET /api/classes/:id/students
   */
  static async getClassStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const classDoc = await ClassModel.findOne({
        _id: id,
        teacher_id: userId
      }).populate("student_ids", "student_id first_name last_name email status");

      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      res.json({
        students: classDoc.student_ids,
        total: classDoc.student_ids.length
      });
    } catch (error) {
      next(error);
    }
  }
}
