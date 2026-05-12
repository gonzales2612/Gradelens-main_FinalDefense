// features/accounts/columns/accounts.columns.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Account } from "../types/accounts.types";
import type { ColumnDef } from "@tanstack/react-table";
import { IconEdit, IconTrash } from "@tabler/icons-react";

interface GetAccountColumnsProps {
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

export default function getAccountColumns({
  onEdit,
  onDelete,
}: GetAccountColumnsProps): ColumnDef<Account>[] {
    return [
        {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("email")}</div>
        ),
        },
        {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.getValue("role") as string;
            return (
            <Badge variant={role === "admin" ? "default" : "secondary"}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
            );
        },
        },
        {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("isActive") as boolean;
            return (
            <Badge>
                {isActive ? "Active" : "Inactive"}
            </Badge>
            );
        },
        },
        {
        accessorKey: "emailVerified",
        header: "Email Verified",
        cell: ({ row }) => {
            const verified = row.getValue("emailVerified") as boolean;
            return (
            <Badge variant={verified ? "outline" : "secondary"}>
                {verified ? "Yes" : "No"}
            </Badge>
            );
        },
        },
        {
        id: "actions",
        enableHiding: false,
        header: "Actions",
        cell: ({ row }) => {
            const account = row.original;
            return (
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(account)}>
                <IconEdit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(account._id)}>
                <IconTrash className="h-4 w-4" />
                </Button>
            </div>
            );
        },
        },
    ];
}