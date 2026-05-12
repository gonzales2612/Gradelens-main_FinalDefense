// features/accounts/components/AccountFormDialog.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Account } from "../types/accounts.types";

const accountSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["teacher", "admin"]),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountFormData) => Promise<boolean>;
  account?: Account;
  mode: "create" | "edit";
}

export function AccountFormDialog({
  open,
  onOpenChange,
  onSubmit,
  account,
  mode,
}: AccountFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      role: "teacher",
      isActive: true,
      emailVerified: false,
    },
  });

  useEffect(() => {
    if (account && mode === "edit") {
      setValue("email", account.email);
      setValue("password", "");
      setValue("firstName", account.firstName);
      setValue("middleName", account.middleName || "");
      setValue("lastName", account.lastName);
      setValue("role", account.role);
      setValue("isActive", account.isActive);
      setValue("emailVerified", account.emailVerified);
    } else {
      reset({
        email: "",
        password: "",
        firstName: "",
        middleName: "",
        lastName: "",
        role: "teacher",
        isActive: true,
        emailVerified: false,
      });
    }
  }, [account, mode, setValue, reset]);

  const onSubmitForm = async (data: AccountFormData) => {
    // Remove password if empty (for edit mode)
    const cleanData = {
      ...data,
      password: data.password || undefined,
    };
    const success = await onSubmit(cleanData);
    if (success) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Account" : "Edit Account"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new user account. All fields marked with * are required."
              : "Update account information. Leave password blank to keep current password."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              {...register("firstName")}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              type="text"
              {...register("middleName")}
              placeholder="Michael (optional)"
            />
            {errors.middleName && (
              <p className="text-sm text-destructive">{errors.middleName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              {...register("lastName")}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {mode === "create" && <span className="text-destructive">*</span>}
              {mode === "edit" && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder={mode === "create" ? "Minimum 6 characters" : "Enter new password"}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register("role")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Account Settings</h4>
              <Badge variant="outline">Optional</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register("isActive")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Account is active
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="emailVerified"
                {...register("emailVerified")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="emailVerified" className="font-normal cursor-pointer">
                Email is verified
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Account" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}