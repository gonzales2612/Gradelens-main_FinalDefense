import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/features/students/hooks/useStudents";
import { StudentFormDialog } from "@/features/students/components/StudentFormDialog";
import { useGrades } from "@/features/grades/hooks/useGrades";
import { useSections } from "@/features/sections/hooks/useSections";
import { useAuth } from "@/features/auth";
import type { CreateStudentRequest, Student, UpdateStudentRequest } from "@/features/students/types/students.types";
import DataTable from "@/components/data-table";
import getStudentColumns from "@/features/students/columns/students.columns";
import CrudListLayout from "@/layouts/CrudListLayout";

export default function StudentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { students, error, loadStudents, createStudent, updateStudent, deleteStudent } = useStudents();
  const { grades, loadGrades } = useGrades();
  const { sections, loadSections } = useSections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadStudents();
    loadGrades();
    loadSections();
  }, [loadStudents, loadGrades, loadSections]);

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to deactivate this student?`)) {
      await deleteStudent(id);
    }
  };

  const handleAdd = () => {
    setEditingStudent(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateStudentRequest | UpdateStudentRequest) => {
    if (dialogMode === "create") {
      return await createStudent(data as CreateStudentRequest);
    } else if (editingStudent) {
      return await updateStudent(editingStudent._id, data as UpdateStudentRequest);
    }
    return false;
  };

  return (
    <>
      <CrudListLayout
        title="Students"
        subtitle="Manage students and their information"
        onAdd={isAdmin ? handleAdd : undefined}
        addLabel="Add Student"
        isLoading={false}
        error={error}
        itemsLength={students.length}
        emptyTitle="No students yet"
        emptyDescription="Create your first student to get started"
        emptyActionLabel="Create your first student"
      >
        <DataTable 
          columns={getStudentColumns({ 
            onEdit: isAdmin ? handleEdit : undefined, 
            onDelete: isAdmin ? (id) => handleDelete(id) : undefined,
            navigate 
          })} 
          data={students} 
          searchColumn="name" 
        />
      </CrudListLayout>

      {isAdmin && (
        <StudentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          student={editingStudent}
          mode={dialogMode}
          grades={grades}
          sections={sections}
        />
      )}
    </>
  );
}
