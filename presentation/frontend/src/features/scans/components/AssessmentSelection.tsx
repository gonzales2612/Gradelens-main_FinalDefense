import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Exam } from "@/features/exams/types/exams.types";
import type { Student } from "@/features/students/types/students.types";

interface AssessmentSelectionProps {
  exams: Exam[];
  students: Student[];
  selectedExam: string;
  selectedStudent: string;
  onExamChange: (value: string) => void;
  onStudentChange: (value: string) => void;
  examDetails?: Exam;
  hasDuplicate?: boolean;
}

export function AssessmentSelection({
  exams,
  students,
  selectedExam,
  selectedStudent,
  onExamChange,
  onStudentChange,
  examDetails,
  hasDuplicate,
}: AssessmentSelectionProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2 min-w-64">
        <Label htmlFor="exam-select" className="text-sm font-medium">
          Exam
        </Label>
        <Select value={selectedExam} onValueChange={onExamChange}>
          <SelectTrigger id="exam-select" className="w-full">
            <SelectValue placeholder="Select Exam" />
          </SelectTrigger>
          <SelectContent>
            {exams.map((exam) => (
              <SelectItem key={exam._id} value={exam._id}>
                {exam.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 min-w-64">
        <Label htmlFor="student-select" className="text-sm font-medium">
          Student
        </Label>
        <Select value={selectedStudent} onValueChange={onStudentChange}>
          <SelectTrigger id="student-select" className="w-full">
            <SelectValue placeholder="Select Student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student._id} value={student._id}>
                {student.first_name} {student.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedExam && examDetails && (
        <div className="rounded-lg border bg-muted/30 px-4 py-2.5 flex items-center gap-3">
          <div className="text-sm font-medium">{examDetails.name}</div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {examDetails.question_count || 0} questions
            </Badge>
            <Badge variant="outline" className="text-xs">
              {examDetails.total_points || 0} points
            </Badge>
            {hasDuplicate && (
              <Badge variant="destructive" className="text-xs">
                Duplicate
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
