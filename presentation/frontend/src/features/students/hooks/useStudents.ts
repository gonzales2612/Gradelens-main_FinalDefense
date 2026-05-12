import { useState, useCallback } from "react";
import { studentsApi } from "../api/students.api";
import type { Student, CreateStudentRequest, UpdateStudentRequest } from "../types/students.types";
import { getErrorMessage } from "@/lib/error";

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadStudents = useCallback(async (params?: {
    status?: string;
    class_id?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentsApi.list(params);
      setStudents(data.students);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load students");
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentsApi.getById(id);
      setSelectedStudent(data.student);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load student");
      console.error("Failed to load student:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStudent = useCallback(async (student: CreateStudentRequest) => {
    setLoading(true);
    setError(null);
    try {
      await studentsApi.create(student);
      await loadStudents();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to create student");
      console.error("Failed to create student:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadStudents]);

  const updateStudent = useCallback(async (id: string, updates: UpdateStudentRequest) => {
    setLoading(true);
    setError(null);
    try {
      await studentsApi.update(id, updates);
      await loadStudents();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update student");
      console.error("Failed to update student:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadStudents]);

  const deleteStudent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await studentsApi.delete(id);
      await loadStudents();
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to delete student");
      console.error("Failed to delete student:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadStudents]);

  return {
    students,
    selectedStudent,
    loading,
    error,
    total,
    loadStudents,
    loadStudent,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}
