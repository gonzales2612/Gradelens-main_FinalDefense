import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { studentsApi } from "@/features/students/api/students.api";
import type { Student } from "@/features/students/types/students.types";
import { getErrorMessage } from "@/lib/error";

interface StudentSelectorProps {
  gradeId?: string;
  sectionIds?: string[];
  selectedStudentIds: string[];
  onStudentToggle: (studentId: string) => void;
  onSelectAll: (studentIds: string[]) => void;
  onDeselectAll: () => void;
}

export function StudentSelector({
  gradeId,
  sectionIds,
  selectedStudentIds,
  onStudentToggle,
  onSelectAll,
  onDeselectAll,
}: StudentSelectorProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gradeId) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await studentsApi.list({
          status: "active",
          limit: 1000,
        });

        // Filter students by grade and section on the frontend
        let filteredStudents = response.students.filter(
          (student) => student.grade_id === gradeId
        );

        if (sectionIds && sectionIds.length > 0) {
          filteredStudents = filteredStudents.filter(
            (student) => student.section_id && sectionIds.includes(student.section_id)
          );
        }

        setStudents(filteredStudents);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Failed to load students");
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [gradeId, sectionIds]);

  const allSelected = students.length > 0 && students.every(
    (student) => selectedStudentIds.includes(student._id)
  );

  const someSelected = students.some(
    (student) => selectedStudentIds.includes(student._id)
  );

  if (!gradeId) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Select a grade to view students
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No students found in this {sectionIds && sectionIds.length > 0 ? "section(s)" : "grade"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <Label className="text-sm font-medium">
          Students ({students.length})
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (allSelected) {
                onDeselectAll();
              } else {
                onSelectAll(students.map((s) => s._id));
              }
            }}
            className="h-7 text-xs"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-75 pr-4">
        <div className="space-y-2">
          {students.map((student) => {
            const isSelected = selectedStudentIds.includes(student._id);
            return (
              <div
                key={student._id}
                className="flex items-center space-x-3 rounded-md border px-3 py-2.5 hover:bg-accent"
              >
                <Checkbox
                  id={`student-${student._id}`}
                  checked={isSelected}
                  onCheckedChange={() => onStudentToggle(student._id)}
                />
                <label
                  htmlFor={`student-${student._id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  <div className="font-medium">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {student.student_id}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {someSelected && (
        <div className="text-xs text-muted-foreground">
          {selectedStudentIds.filter((id) =>
            students.some((s) => s._id === id)
          ).length}{" "}
          student(s) selected
        </div>
      )}
    </div>
  );
}
