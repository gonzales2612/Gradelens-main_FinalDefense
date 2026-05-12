import { useEffect, useState } from "react";
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
import { StudentSelector } from "./StudentSelector";
import type { Class } from "../types/classes.types";
import type { Grade } from "@/features/grades/types/grades.types";
import type { Section } from "@/features/sections/types/sections.types";

const classSchema = z.object({
  class_id: z.string().min(1, "Class ID is required"),
  name: z.string().min(1, "Class name is required"),
  academic_year: z.string().min(1, "Academic year is required"),
  grade_id: z.string().optional(),
  section_ids: z.array(z.string()).optional(),
  status: z.enum(["active", "completed", "archived"]),
  student_ids: z.array(z.string()).optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClassFormData) => Promise<boolean>;
  classData?: Class;
  mode: "create" | "edit";
  grades: Grade[];
  sections: Section[];
}

export function ClassFormDialog({
  open,
  onOpenChange,
  onSubmit,
  classData,
  mode,
  grades,
  sections,
}: ClassFormDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      status: "active",
      section_ids: [],
    },
  });

  useEffect(() => {
    if (classData && mode === "edit") {
      setValue("class_id", classData.class_id);
      setValue("name", classData.name);
      setValue("academic_year", classData.academic_year);
      setValue("grade_id", classData.grade_id || "");
      setValue("section_ids", classData.section_ids || []);
      setValue("status", classData.status);
      setSelectedGradeId(classData.grade_id || "");
      setSelectedSectionIds(classData.section_ids || []);
      setSelectedStudentIds(classData.student_ids || []);
    } else {
      reset({
        class_id: "",
        name: "",
        academic_year: new Date().getFullYear().toString(),
        grade_id: "",
        section_ids: [],
        status: "active",
      });
      setSelectedGradeId("");
      setSelectedSectionIds([]);
      setSelectedStudentIds([]);
    }
  }, [classData, mode, setValue, reset]);

  // Watch grade and section changes
  const gradeId = watch("grade_id");

  useEffect(() => {
    setSelectedGradeId(gradeId || "");
  }, [gradeId]);

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = (studentIds: string[]) => {
    setSelectedStudentIds((prev) => {
      // Add all student IDs that aren't already selected
      const newIds = studentIds.filter((id) => !prev.includes(id));
      return [...prev, ...newIds];
    });
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const onSubmitForm = async (data: ClassFormData) => {
    // Remove empty grade_id and section_id
    const cleanData = {
      ...data,
      grade_id: data.grade_id || undefined,
      section_ids: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      student_ids: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
    };
    const success = await onSubmit(cleanData);
    if (success) {
      reset();
      setSelectedStudentIds([]);
      setSelectedGradeId("");
      setSelectedSectionIds([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-225">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Class" : "Edit Class"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new class to organize students. All fields marked with * are required."
              : "Update class information. Changes will be saved immediately."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column - Class Information */}
          <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class_id">
              Class ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="class_id"
              {...register("class_id")}
              placeholder="e.g., CS101-2024, MATH-A-2024"
              disabled={mode === "edit"}
            />
            {errors.class_id && (
              <p className="text-sm text-destructive">{errors.class_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Class Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Computer Science 101, Mathematics A"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic_year">
              Academic Year <span className="text-destructive">*</span>
            </Label>
            <Input
              id="academic_year"
              {...register("academic_year")}
              placeholder="e.g., 2024, 2024-2025"
            />
            {errors.academic_year && (
              <p className="text-sm text-destructive">{errors.academic_year.message}</p>
            )}
          </div>

            <div>
              <div className="space-y-2" />

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  {...register("status")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Class Assignment</h4>
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
              <Label htmlFor="section_ids">Sections</Label>
              <div className="flex flex-col gap-2">
                {sections.map((section) => (
                  <label key={section._id} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      value={section._id}
                      checked={selectedSectionIds.includes(section._id)}
                      onChange={() => {
                        setSelectedSectionIds((prev) =>
                          prev.includes(section._id) ? prev.filter((s) => s !== section._id) : [...prev, section._id]
                        );
                      }}
                    />
                    <span>{section.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          </div>

          {/* Right Column - Student Selection */}
          <div className="rounded-lg border p-4">        
            <div className="mb-3 flex items-center gap-2">
              <h4 className="text-sm font-medium">Add Students</h4>
              <Badge variant="outline">Optional</Badge>
            </div>
            <StudentSelector
              gradeId={selectedGradeId}
              sectionIds={selectedSectionIds}
              selectedStudentIds={selectedStudentIds}
              onStudentToggle={handleStudentToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Class" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
