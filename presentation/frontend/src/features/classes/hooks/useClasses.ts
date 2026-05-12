import { useState, useCallback } from "react";
import { classesApi } from "../api/classes.api";
import type { Class, CreateClassRequest, UpdateClassRequest } from "../types/classes.types";
import { getErrorMessage } from "@/lib/error";

export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadClasses = useCallback(async (params?: {
    status?: string;
    academic_year?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await classesApi.list(params);
      setClasses(data.classes);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load classes");
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClass = useCallback(async (id: string, populateStudents = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await classesApi.getById(id, populateStudents);
      setSelectedClass(data.class);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load class");
      console.error("Failed to load class:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClass = useCallback(async (classData: CreateClassRequest) => {
    setLoading(true);
    setError(null);
    try {
      await classesApi.create(classData);
      await loadClasses();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create class");
      console.error("Failed to create class:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadClasses]);

  const updateClass = useCallback(async (id: string, updates: UpdateClassRequest) => {
    setLoading(true);
    setError(null);
    try {
      await classesApi.update(id, updates);
      await loadClasses();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update class");
      console.error("Failed to update class:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadClasses]);

  const deleteClass = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await classesApi.delete(id);
      await loadClasses();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to delete class");
      console.error("Failed to delete class:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadClasses]);

  // (DEPRECATED): Now using ClassStudentSyncService in backend
  // const addStudent = useCallback(async (classId: string, studentId: string) => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     await classesApi.addStudent(classId, studentId);
  //     await loadClass(classId, true);
  //     return true;
  //   } catch (err: unknown) {
  //     setError(getErrorMessage(err) || "Failed to add student");
  //     console.error("Failed to add student:", err);
  //     return false;
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [loadClass]);

  // (DEPRECATED): Now using ClassStudentSyncService in backend
  // const removeStudent = useCallback(async (classId: string, studentId: string) => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     await classesApi.removeStudent(classId, studentId);
  //     await loadClass(classId, true);
  //     return true;
  //   } catch (err: unknown) {
  //     setError(getErrorMessage(err) || "Failed to remove student");
  //     console.error("Failed to remove student:", err);
  //     return false;
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [loadClass]);

  return {
    classes,
    selectedClass,
    loading,
    error,
    total,
    loadClasses,
    loadClass,
    createClass,
    updateClass,
    deleteClass,
    // addStudent,
    // removeStudent,
  };
}
