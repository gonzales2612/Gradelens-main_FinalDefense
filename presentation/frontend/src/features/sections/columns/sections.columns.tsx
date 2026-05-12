import type { ColumnDef } from "@tanstack/react-table";
import type { Section } from "../types/sections.types";
import type { Grade } from "@/features/grades/types/grades.types";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash } from "@tabler/icons-react";

export type SectionColumnActions = {
  onEdit: (s: Section) => void;
  onDelete: (s: Section) => void;
  grades?: Grade[];
};

export function getSectionColumns({ onEdit, onDelete, grades = [] }: SectionColumnActions): ColumnDef<Section>[] {
  const getGradeName = (gradeId: string | { name: string; level: number } | undefined) => {
    if (!gradeId) return "All Grades";
    if (typeof gradeId === "object") return `${gradeId.name} (Level ${gradeId.level})`;
    const grade = grades.find((g) => g._id === gradeId);
    return grade ? `${grade.name} (Level ${grade.level})` : "All Grades";
  };

  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "section_id",
      header: "ID",
    },
    {
      accessorKey: "grade_id",
      header: "Grade",
      cell: ({ row }) => <div>{getGradeName(row.getValue("grade_id"))}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue("description")}</div>,
    },
    {
      id: "actions",
      enableHiding: false,
      header: "Actions",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(s)}>
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}

export default getSectionColumns;
