import type { ColumnDef } from "@tanstack/react-table";
import type { Grade } from "../types/grades.types";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash } from "@tabler/icons-react";

export type GradeColumnActions = {
  onEdit: (g: Grade) => void;
  onDelete: (g: Grade) => void;
};

export function getGradeColumns({ onEdit, onDelete }: GradeColumnActions): ColumnDef<Grade>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => <div>{row.getValue("level")}</div>,
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
        const grade = row.original;
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(grade)}>
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(grade)}>
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}

export default getGradeColumns;
