import { useEffect, useState } from "react";
import { useSections } from "../features/sections/hooks/useSections";
import { useGrades } from "../features/grades/hooks/useGrades";
import { SectionFormDialog } from "../features/sections/components/SectionFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateSectionRequest, Section, UpdateSectionRequest } from "../features/sections/types/sections.types";
import DataTable from "@/components/data-table";
import getSectionColumns from "@/features/sections/columns/sections.columns";
import CrudListLayout from "@/layouts/CrudListLayout";

export function SectionsPage() {
  const { sections, loading, error, loadSections, createSection, updateSection, deleteSection } = useSections();
  const { grades, loadGrades } = useGrades();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | undefined>();
  const [mode, setMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    loadSections();
    loadGrades();
  }, [loadSections, loadGrades]);

  const handleCreate = () => {
    setSelectedSection(undefined);
    setMode("create");
    setIsDialogOpen(true);
  };

  const handleEdit = (section: Section) => {
    setSelectedSection(section);
    setMode("edit");
    setIsDialogOpen(true);
  };

  const handleDelete = async (section: Section) => {
    if (window.confirm(`Are you sure you want to deactivate ${section.name}?`)) {
      await deleteSection(section._id);
    }
  };

  const handleSubmit = async (data: CreateSectionRequest | UpdateSectionRequest) => {
    if (mode === "create") {
      return await createSection(data as CreateSectionRequest);
    } else if (selectedSection) {
      return await updateSection(selectedSection._id, data as UpdateSectionRequest);
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
        title="Sections"
        subtitle="Manage class sections"
        onAdd={handleCreate}
        addLabel="Add Section"
        isLoading={loading}
        error={error}
        itemsLength={sections.length}
        emptyTitle="No sections yet"
        emptyDescription="Create your first section"
        emptyActionLabel="Create your first section"
      >
        <DataTable columns={getSectionColumns({ onEdit: handleEdit, onDelete: handleDelete, grades })} data={sections} searchColumn="name" />
      </CrudListLayout>

      <SectionFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        section={selectedSection}
        grades={grades}
        mode={mode}
      />
    </>
  );
}
