import { Types } from "mongoose";
import { StudentModel } from "../models/Student.ts";
import { ClassModel } from "../models/Class.ts";

/**
 * ClassStudentSyncService
 * 
 * Maintains bidirectional relationship between Classes and Students.
 * Ensures that:
 * - When a student is added to a class, the class is added to student's class_ids
 * - When a student is removed from a class, the class is removed from student's class_ids
 * - When a class is deleted, it's removed from all students' class_ids
 * - When a student is deleted, it's removed from all classes' student_ids
 */

export class ClassStudentSyncService {
  /**
   * Add student to class (bidirectional)
   * Updates both Class.student_ids and Student.class_ids
   */
  static async addStudentToClass(
    classId: Types.ObjectId,
    studentId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [classDoc, studentDoc] = await Promise.all([
        ClassModel.findById(classId),
        StudentModel.findById(studentId)
      ]);

      if (!classDoc) {
        return { success: false, error: "Class not found" };
      }

      if (!studentDoc) {
        return { success: false, error: "Student not found" };
      }

      // Add student to class if not already present
      const classNeedsUpdate = !classDoc.student_ids.some(id => id.equals(studentId));
      if (classNeedsUpdate) {
        classDoc.student_ids.push(studentId);
      }

      // Add class to student if not already present
      const studentNeedsUpdate = !studentDoc.class_ids.some(id => id.equals(classId));
      if (studentNeedsUpdate) {
        studentDoc.class_ids.push(classId);
      }

      // Save both documents
      await Promise.all([
        classNeedsUpdate ? classDoc.save() : Promise.resolve(),
        studentNeedsUpdate ? studentDoc.save() : Promise.resolve()
      ]);

      return { success: true };
    } catch (error) {
      console.error("Error in addStudentToClass:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Remove student from class (bidirectional)
   * Updates both Class.student_ids and Student.class_ids
   */
  static async removeStudentFromClass(
    classId: Types.ObjectId,
    studentId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [classDoc, studentDoc] = await Promise.all([
        ClassModel.findById(classId),
        StudentModel.findById(studentId)
      ]);

      if (!classDoc) {
        return { success: false, error: "Class not found" };
      }

      if (!studentDoc) {
        return { success: false, error: "Student not found" };
      }

      // Remove student from class
      const originalClassSize = classDoc.student_ids.length;
      classDoc.student_ids = classDoc.student_ids.filter(id => !id.equals(studentId));
      const classNeedsUpdate = classDoc.student_ids.length !== originalClassSize;

      // Remove class from student
      const originalStudentSize = studentDoc.class_ids.length;
      studentDoc.class_ids = studentDoc.class_ids.filter(id => !id.equals(classId));
      const studentNeedsUpdate = studentDoc.class_ids.length !== originalStudentSize;

      // Save both documents
      await Promise.all([
        classNeedsUpdate ? classDoc.save() : Promise.resolve(),
        studentNeedsUpdate ? studentDoc.save() : Promise.resolve()
      ]);

      return { success: true };
    } catch (error) {
      console.error("Error in removeStudentFromClass:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Add multiple students to class (bidirectional)
   */
  static async addStudentsToClass(
    classId: Types.ObjectId,
    studentIds: Types.ObjectId[]
  ): Promise<{ success: boolean; error?: string; addedCount?: number }> {
    try {
      let addedCount = 0;

      for (const studentId of studentIds) {
        const result = await this.addStudentToClass(classId, studentId);
        if (result.success) {
          addedCount++;
        }
      }

      return { success: true, addedCount };
    } catch (error) {
      console.error("Error in addStudentsToClass:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Remove multiple students from class (bidirectional)
   */
  static async removeStudentsFromClass(
    classId: Types.ObjectId,
    studentIds: Types.ObjectId[]
  ): Promise<{ success: boolean; error?: string; removedCount?: number }> {
    try {
      let removedCount = 0;

      for (const studentId of studentIds) {
        const result = await this.removeStudentFromClass(classId, studentId);
        if (result.success) {
          removedCount++;
        }
      }

      return { success: true, removedCount };
    } catch (error) {
      console.error("Error in removeStudentsFromClass:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Update student's classes (replaces all class associations)
   * Used when updating a student's class_ids directly
   */
  static async updateStudentClasses(
    studentId: Types.ObjectId,
    newClassIds: Types.ObjectId[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const studentDoc = await StudentModel.findById(studentId);
      if (!studentDoc) {
        return { success: false, error: "Student not found" };
      }

      const oldClassIds = studentDoc.class_ids;

      // Find classes to remove (in old but not in new)
      const classesToRemove = oldClassIds.filter(
        oldId => !newClassIds.some(newId => newId.equals(oldId))
      );

      // Find classes to add (in new but not in old)
      const classesToAdd = newClassIds.filter(
        newId => !oldClassIds.some(oldId => oldId.equals(newId))
      );

      // Remove student from classes they're leaving
      for (const classId of classesToRemove) {
        const classDoc = await ClassModel.findById(classId);
        if (classDoc) {
          classDoc.student_ids = classDoc.student_ids.filter(id => !id.equals(studentId));
          await classDoc.save();
        }
      }

      // Add student to new classes
      for (const classId of classesToAdd) {
        const classDoc = await ClassModel.findById(classId);
        if (classDoc && !classDoc.student_ids.some(id => id.equals(studentId))) {
          classDoc.student_ids.push(studentId);
          await classDoc.save();
        }
      }

      // Update student's class_ids
      studentDoc.class_ids = newClassIds;
      await studentDoc.save();

      return { success: true };
    } catch (error) {
      console.error("Error in updateStudentClasses:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Update class's students (replaces all student associations)
   * Used when updating a class's student_ids directly
   */
  static async updateClassStudents(
    classId: Types.ObjectId,
    newStudentIds: Types.ObjectId[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const classDoc = await ClassModel.findById(classId);
      if (!classDoc) {
        return { success: false, error: "Class not found" };
      }

      const oldStudentIds = classDoc.student_ids;

      // Find students to remove (in old but not in new)
      const studentsToRemove = oldStudentIds.filter(
        oldId => !newStudentIds.some(newId => newId.equals(oldId))
      );

      // Find students to add (in new but not in old)
      const studentsToAdd = newStudentIds.filter(
        newId => !oldStudentIds.some(oldId => oldId.equals(newId))
      );

      // Remove class from students who are leaving
      for (const studentId of studentsToRemove) {
        const student = await StudentModel.findById(studentId);
        if (student) {
          student.class_ids = student.class_ids.filter(id => !id.equals(classId));
          await student.save();
        }
      }

      // Add class to new students
      for (const studentId of studentsToAdd) {
        const student = await StudentModel.findById(studentId);
        if (student && !student.class_ids.some(id => id.equals(classId))) {
          student.class_ids.push(classId);
          await student.save();
        }
      }

      // Update class's student_ids
      classDoc.student_ids = newStudentIds;
      await classDoc.save();

      return { success: true };
    } catch (error) {
      console.error("Error in updateClassStudents:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Remove class from all students (when class is deleted)
   */
  static async removeClassFromAllStudents(
    classId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    try {
      const result = await StudentModel.updateMany(
        { class_ids: classId },
        { $pull: { class_ids: classId } }
      );

      return { success: true, updatedCount: result.modifiedCount };
    } catch (error) {
      console.error("Error in removeClassFromAllStudents:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Remove student from all classes (when student is deleted)
   */
  static async removeStudentFromAllClasses(
    studentId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
    try {
      const result = await ClassModel.updateMany(
        { student_ids: studentId },
        { $pull: { student_ids: studentId } }
      );

      return { success: true, updatedCount: result.modifiedCount };
    } catch (error) {
      console.error("Error in removeStudentFromAllClasses:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Sync class-student relationships for a class
   * Ensures all students in class.student_ids have the class in their class_ids
   */
  static async syncClassStudents(
    classId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string; syncedCount?: number }> {
    try {
      const classDoc = await ClassModel.findById(classId);
      if (!classDoc) {
        return { success: false, error: "Class not found" };
      }

      let syncedCount = 0;

      for (const studentId of classDoc.student_ids) {
        const studentDoc = await StudentModel.findById(studentId);
        if (studentDoc && !studentDoc.class_ids.some(id => id.equals(classId))) {
          studentDoc.class_ids.push(classId);
          await studentDoc.save();
          syncedCount++;
        }
      }

      return { success: true, syncedCount };
    } catch (error) {
      console.error("Error in syncClassStudents:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Sync student-class relationships for a student
   * Ensures all classes in student.class_ids have the student in their student_ids
   */
  static async syncStudentClasses(
    studentId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string; syncedCount?: number }> {
    try {
      const studentDoc = await StudentModel.findById(studentId);
      if (!studentDoc) {
        return { success: false, error: "Student not found" };
      }

      let syncedCount = 0;

      for (const classId of studentDoc.class_ids) {
        const classDoc = await ClassModel.findById(classId);
        if (classDoc && !classDoc.student_ids.some(id => id.equals(studentId))) {
          classDoc.student_ids.push(studentId);
          await classDoc.save();
          syncedCount++;
        }
      }

      return { success: true, syncedCount };
    } catch (error) {
      console.error("Error in syncStudentClasses:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }
}
