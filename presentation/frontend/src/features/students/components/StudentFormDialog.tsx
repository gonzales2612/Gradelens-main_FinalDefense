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
import type { Student } from "../types/students.types";
import type { Grade } from "@/features/grades/types/grades.types";
import type { Section } from "@/features/sections/types/sections.types";

const studentSchema = z.object({
  student_id: z.string().min(1, "Student ID is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "graduated"]),
  grade_id: z.string().optional(),
  section_id: z.string().optional(),
  metadata: z.object({
    guardian_contact: z.string().optional(),
  }).optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StudentFormData) => Promise<boolean>;
  student?: Student;
  mode: "create" | "edit";
  grades: Grade[];
  sections: Section[];
}

export function StudentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  student,
  mode,
  grades,
  sections,
}: StudentFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      status: "active",
    },
  });

  useEffect(() => {
    if (student && mode === "edit") {
      setValue("student_id", student.student_id);
      setValue("first_name", student.first_name);
      setValue("last_name", student.last_name);
      setValue("email", student.email || "");
      setValue("status", student.status);
      setValue("grade_id", student.grade_id || "");
      setValue("section_id", student.section_id || "");
      setValue("metadata.guardian_contact", student.metadata?.guardian_contact || "");
    } else {
      reset({
        student_id: "",
        first_name: "",
        last_name: "",
        email: "",
        status: "active",
        grade_id: "",
        section_id: "",
        metadata: {
          guardian_contact: "",
        },
      });
    }
  }, [student, mode, setValue, reset]);

  const onSubmitForm = async (data: StudentFormData) => {
    // Remove empty grade_id and section_id
    const cleanData = {
      ...data,
      grade_id: data.grade_id || undefined,
      section_id: data.section_id || undefined,
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
          <DialogTitle>{mode === "create" ? "Add Student" : "Edit Student"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new student record. All fields marked with * are required."
              : "Update student information. Changes will be saved immediately."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student_id">
              Student ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="student_id"
              {...register("student_id")}
              placeholder="e.g., 2024-00001"
              disabled={mode === "edit"}
            />
            {errors.student_id && (
              <p className="text-sm text-destructive">{errors.student_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input id="first_name" {...register("first_name")} placeholder="John" />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input id="last_name" {...register("last_name")} placeholder="Doe" />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="student@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register("status")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Additional Information</h4>
              <Badge variant="outline">Optional</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade_id">Grade</Label>
              <select
                id="grade_id"
                {...register("grade_id")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Select Grade</option>
                {grades.map((grade) => (
                  <option key={grade._id} value={grade._id}>
                    {grade.name} (Level {grade.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section_id">Section</Label>
              <select
                id="section_id"
                {...register("section_id")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Select Section</option>
                {sections.map((section) => (
                  <option key={section._id} value={section._id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian_contact">Guardian Contact</Label>
              <Input
                id="guardian_contact"
                {...register("metadata.guardian_contact")}
                placeholder="Phone or email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Student" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
