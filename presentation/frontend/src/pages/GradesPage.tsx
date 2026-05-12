import { useEffect, useState } from "react";
import { useGrades } from "../features/grades/hooks/useGrades";
import { GradeFormDialog } from "../features/grades/components/GradeFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateGradeRequest, Grade, UpdateGradeRequest } from "../features/grades/types/grades.types";
import DataTable from "@/components/data-table";
import getGradeColumns from "../features/grades/columns/grades.columns";
import CrudListLayout from "@/layouts/CrudListLayout";

export function GradesPage() {
  const { grades, loading, error, loadGrades, createGrade, updateGrade, deleteGrade } = useGrades();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | undefined>();
  const [mode, setMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const handleCreate = () => {
    setSelectedGrade(undefined);
    setMode("create");
    setIsDialogOpen(true);
  };

  const handleEdit = (grade: Grade) => {
    setSelectedGrade(grade);
    setMode("edit");
    setIsDialogOpen(true);
  };

  const handleDelete = async (grade: Grade) => {
    if (window.confirm(`Are you sure you want to deactivate ${grade.name}?`)) {
      await deleteGrade(grade._id);
    }
  };

  const handleSubmit = async (data: CreateGradeRequest | UpdateGradeRequest) => {
    if (mode === "create") {
      return await createGrade(data as CreateGradeRequest);
    } else if (selectedGrade) {
      return await updateGrade(selectedGrade._id, data as UpdateGradeRequest);
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
        title="Grades"
        subtitle="Manage grade levels for your school"
        onAdd={handleCreate}
        addLabel="Add Grade"
        isLoading={loading}
        error={error}
        itemsLength={grades.length}
        emptyTitle="No grades yet"
        emptyDescription="Create your first grade to get started"
        emptyActionLabel="Create your first grade"
      >
        <DataTable columns={getGradeColumns({ onEdit: handleEdit, onDelete: handleDelete })} data={grades} searchColumn="name" />
      </CrudListLayout>

      <GradeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        grade={selectedGrade}
        mode={mode}
      />
    </>
  );
}
