// features/report/components/PLEntries.tsx
import React, { useState } from "react";
import { Loading } from "@/components/loading";
import PLEntriesSections from "./PLEntriesSection";
import PLEntriesOverall from "./PLEntriesOverall";
import type { PLEntriesSection, IPLEntriesOverall as PLEntriesOverallType } from "@/features/report/types/reports.types";

export interface PLEntriesProps {
  sections: PLEntriesSection[];
  overall: PLEntriesOverallType | null;
  view: "section" | "overall";
  isLoading?: boolean;
  error?: string | null;
}

export const PLEntries: React.FC<PLEntriesProps> = ({ 
  sections,
  overall,
  view,
  isLoading = false,
  error = null 
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading text="Loading PL Entries..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No sections found for selected class and exam.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Please verify that the class has sections assigned and students have been scanned.
          </p>
        </div>
      </div>
    );
  }

  // Render based on view
  if (view === "overall") {
    return <PLEntriesOverall overall={overall} />;
  }

  return (
    <PLEntriesSections
      sections={sections}
      expandedSection={expandedSection}
      setExpandedSection={setExpandedSection}
    />
  );
};

export default PLEntries;