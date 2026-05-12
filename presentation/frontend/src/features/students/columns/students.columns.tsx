import type { ColumnDef } from "@tanstack/react-table";
import type { Student } from "../types/students.types";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import type { NavigateFunction } from "react-router-dom";

export type StudentColumnActions = {
  onEdit?: (s: Student) => void;
  onDelete?: (id: string) => void;
  navigate: NavigateFunction;
};

export function getStudentColumns({ onEdit, onDelete, navigate }: StudentColumnActions): ColumnDef<Student>[] {
  return [
    {
      id: "name",
      header: "Name",
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "student_id",
      header: "ID",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.getValue("status") === "active" ? "default" : row.getValue("status") === "graduated" ? "secondary" : "outline"}
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
        const student = row.original;
        
        return (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/students/${student._id}`)}
              title="View Profile"
            >
              <IconEye className="size-4" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(student)} title="Edit">
                <IconEdit className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(student._id)} title="Delete">
                <IconTrash className="size-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}

export default getStudentColumns;
