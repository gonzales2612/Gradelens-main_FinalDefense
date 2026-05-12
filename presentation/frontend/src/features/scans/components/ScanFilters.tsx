import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Grade } from "@/features/grades/types/grades.types";
import type { Section } from "@/features/sections/types/sections.types";
import type { Class } from "@/features/classes/types/classes.types";

interface ScanFiltersProps {
  grades: Grade[];
  sections: Section[];
  classes: Class[];
  selectedGrade: string;
  selectedSection: string;
  selectedClass: string;
  onGradeChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onClassChange: (value: string) => void;
  filteredSections: Section[];
  filteredClasses: Class[];
}

export function ScanFilters({
  grades,
  selectedGrade,
  selectedSection,
  selectedClass,
  onGradeChange,
  onSectionChange,
  onClassChange,
  filteredSections,
  filteredClasses,
}: ScanFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center pb-4 border-b border-border">
      <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
      
      <Select value={selectedGrade || "all"} onValueChange={(value) => onGradeChange(value === "all" ? "" : value)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="All Grades" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Grades</SelectItem>
          {grades.map((grade) => (
            <SelectItem key={grade._id} value={grade._id}>
              {grade.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedSection || "all"} onValueChange={(value) => onSectionChange(value === "all" ? "" : value)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          {filteredSections.map((section) => (
            <SelectItem key={section._id} value={section._id}>
              {section.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedClass || "all"} onValueChange={(value) => onClassChange(value === "all" ? "" : value)}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {filteredClasses.map((cls) => {
            const grade = grades.find((g) => g._id === cls.grade_id);
            const gradeDisplay = grade ? ` • ${grade.name}` : "";
            return (
              <SelectItem key={cls._id} value={cls._id}>
                {cls.name}{gradeDisplay}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
