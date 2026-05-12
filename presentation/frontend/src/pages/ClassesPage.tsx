import { useEffect, useState } from "react";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { ClassFormDialog } from "@/features/classes/components/ClassFormDialog";
import { useGrades } from "@/features/grades/hooks/useGrades";
import { useSections } from "@/features/sections/hooks/useSections";
import type { Class, CreateClassRequest, UpdateClassRequest } from "@/features/classes/types/classes.types";
import DataTable from "@/components/data-table";
import getClassColumns from "@/features/classes/columns/classes.columns";
import CrudListLayout from "@/layouts/CrudListLayout";

export default function ClassesPage() {
  const { classes, loading, error, loadClasses, createClass, updateClass, deleteClass } = useClasses();
  const { grades, loadGrades } = useGrades();
  const { sections, loadSections } = useSections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | undefined>();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    loadClasses();
    loadGrades();
    loadSections();
  }, [loadClasses, loadGrades, loadSections]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to archive ${name}?`)) {
      await deleteClass(id);
    }
  };

  const handleAdd = () => {
    setEditingClass(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (classData: Class) => {
    setEditingClass(classData);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateClassRequest | UpdateClassRequest) => {
    if (dialogMode === "create") {
      return await createClass(data as CreateClassRequest);
    } else if (editingClass) {
      return await updateClass(editingClass._id, data as UpdateClassRequest);
    }
    return false;
  };

  return (
    <>
      <CrudListLayout
        title="Classes"
        subtitle="Organize students into classes and sections"
        onAdd={handleAdd}
        addLabel="Create Class"
        isLoading={loading}
        error={error}
        itemsLength={classes.length}
        emptyTitle="No classes yet"
        emptyDescription="Create your first class to organize students"
        emptyActionLabel="Create your first class"
      >
        <DataTable columns={getClassColumns({ onEdit: handleEdit, onDelete: handleDelete })} data={classes} searchColumn="name" />
      </CrudListLayout>

      <ClassFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        classData={editingClass}
        mode={dialogMode}
        grades={grades}
        sections={sections}
      />
    </>
  );
}
