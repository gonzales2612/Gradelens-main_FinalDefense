import type { ColumnDef } from "@tanstack/react-table";
import type { Class } from "../types/classes.types";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash, IconUsers } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

export type ClassColumnActions = {
  onEdit: (c: Class) => void;
  onDelete: (id: string, name: string) => void;
};

export function getClassColumns({ onEdit, onDelete }: ClassColumnActions): ColumnDef<Class>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "class_id",
      header: "ID",
    },
    {
      accessorKey: "academic_year",
      header: "Academic Year",
    },
    {
      accessorKey: "student_count",
      header: "Students",
      cell: ({ row }) => <div className="flex items-center gap-2"><IconUsers className="size-4" />{row.getValue("student_count") ?? 0}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.getValue("status") === "active" ? "default" : row.getValue("status") === "completed" ? "secondary" : "outline"}
        >
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: "Actions",
      cell: ({ row }) => {
        const cls = row.original;
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(cls)}>
              <IconEdit className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(cls._id, cls.name)}>
              <IconTrash className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}

export default getClassColumns;
