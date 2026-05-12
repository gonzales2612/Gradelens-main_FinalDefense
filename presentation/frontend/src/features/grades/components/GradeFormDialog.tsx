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
import type { Grade } from "../types/grades.types";

const gradeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  level: z.number().min(1, "Level must be at least 1").max(20, "Level must be at most 20"),
  description: z.string().optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

interface GradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GradeFormData) => Promise<boolean>;
  grade?: Grade;
  mode: "create" | "edit";
}

export function GradeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  grade,
  mode,
}: GradeFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
  });

  useEffect(() => {
    if (grade && mode === "edit") {
      setValue("name", grade.name);
      setValue("level", grade.level);
      setValue("description", grade.description || "");
    } else {
      reset({
        name: "",
        level: 7,
        description: "",
      });
    }
  }, [grade, mode, setValue, reset]);

  const onSubmitForm = async (data: GradeFormData) => {
    const success = await onSubmit(data);
    if (success) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Grade" : "Edit Grade"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new grade level. All fields marked with * are required."
              : "Update grade information. Changes will be saved immediately."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* Grade ID is auto-generated on the backend; no input required */}

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Grade 7, 7th Grade"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">
              Level <span className="text-destructive">*</span>
            </Label>
            <Input
              id="level"
              type="number"
              {...register("level", { valueAsNumber: true })}
              placeholder="e.g., 7, 8, 9"
              min="1"
              max="20"
            />
            {errors.level && (
              <p className="text-sm text-destructive">{errors.level.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Numeric level for sorting (1-20)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register("description")}
              placeholder="Optional description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Grade" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
