import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExams } from "@/features/exams/hooks/useExams";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { ExamFormDialog } from "@/features/exams/components/ExamFormDialog";
import type { CreateExamRequest, Exam, UpdateExamRequest } from "@/features/exams/types/exams.types";
import DataTable from "@/components/data-table";
import getExamColumns from "@/features/exams/columns/exams.columns";
import CrudListLayout from "@/layouts/CrudListLayout";

export default function ExamsPage() {
  const { exams, loading, error, loadExams, createExam, updateExam, deleteExam } = useExams();
  const { classes, loadClasses } = useClasses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | undefined>();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    loadExams();
    loadClasses(); // Load classes for the exam form dropdown
  }, [loadExams, loadClasses]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to archive ${name}?`)) {
      await deleteExam(id);
    }
  };

  const handleAdd = () => {
    setEditingExam(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSubmit = async (data: unknown) => {
    if (dialogMode === "create") {
      return await createExam(data as CreateExamRequest);
    } else if (editingExam) {
      return await updateExam(editingExam._id, data as UpdateExamRequest);
    }
    return false;
  };

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <CrudListLayout
        title="Exams"
        subtitle="Create and manage exams with answer keys"
        onAdd={handleAdd}
        addLabel="Create Exam"
        isLoading={loading}
        error={error}
        itemsLength={exams.length}
        emptyTitle="No exams yet"
        emptyDescription="Create your first exam to start grading"
        emptyActionLabel="Create your first exam"
      >
        <DataTable columns={getExamColumns({ onEdit: handleEdit, onDelete: handleDelete })} data={exams} searchColumn="name" />
      </CrudListLayout>

      <ExamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        exam={editingExam}
        mode={dialogMode}
        classes={classes}
      />
    </>
  );
}
