// pages/AccountsPage.tsx
import { useEffect, useState } from "react";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { AccountFormDialog } from "@/features/accounts/components/AccountFormDialog";
import type {
  CreateAccountRequest,
  Account,
  UpdateAccountRequest,
} from "@/features/accounts/types/accounts.types";
import DataTable from "@/components/data-table";
import getAccountColumns from "@/features/accounts/columns/accounts.columns";
import CrudListLayout from "@/layouts/CrudListLayout";

export default function AccountsPage() {
  const {
    accounts,
    stats,
    error,
    loadAccounts,
    loadStats,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    loadAccounts();
    loadStats();
  }, [loadAccounts, loadStats]);

  const handleDelete = async (id: string) => {
    if (
      confirm(
        `Are you sure you want to deactivate this account? The user will no longer be able to log in.`
      )
    ) {
      await deleteAccount(id);
    }
  };

  const handleAdd = () => {
    setEditingAccount(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateAccountRequest | UpdateAccountRequest) => {
    if (dialogMode === "create") {
      return await createAccount(data as CreateAccountRequest);
    } else if (editingAccount) {
      return await updateAccount(editingAccount._id, data as UpdateAccountRequest);
    }
    return false;
  };

  return (
    <>
      <CrudListLayout
        title="User Accounts"
        subtitle="Manage user accounts and permissions"
        onAdd={handleAdd}
        addLabel="Add Account"
        isLoading={false}
        error={error}
        itemsLength={accounts.length}
        emptyTitle="No accounts yet"
        emptyDescription="Create your first user account to get started"
        emptyActionLabel="Create your first account"
      >
        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="rounded-lg bg-card p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">Teachers</p>
              <p className="text-2xl font-bold text-foreground">{stats.teachers}</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <p className="text-sm font-medium text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-primary">{stats.admins}</p>
            </div>
          </div>
        )}

        <DataTable
          columns={getAccountColumns({
            onEdit: handleEdit,
            onDelete: (id) => handleDelete(id),
          })}
          data={accounts}
          searchColumn="email"
        />
      </CrudListLayout>

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        account={editingAccount}
        mode={dialogMode}
      />
    </>
  );
}