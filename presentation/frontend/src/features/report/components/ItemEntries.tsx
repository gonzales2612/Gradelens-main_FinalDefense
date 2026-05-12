// features/report/components/ItemEntries.tsx
import React, { useState } from "react";
import { Loading } from "@/components/loading";
import type { IItemEntriesSection } from "../types/reports.types";
import type { IItemEntriesOverall } from "../types/reports.types";
import { ItemEntriesOverall } from "./ItemEntriesOverall";
import ItemEntriesSections from "./ItemEntriesSections";

export interface ItemEntriesProps {
  sections: IItemEntriesSection[];
  overall: IItemEntriesOverall | null;
  view: "section" | "overall";
  isLoading?: boolean;
  error?: string | null;
}

export const ItemEntries: React.FC<ItemEntriesProps> = ({
  sections,
  overall,
  view,
  isLoading = false,
  error = null,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "mastered" | "developing" | "struggling">("all");

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loading text="Loading Item Entries..." />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center text-red-600">{error}</div>
  );

  if (view === "overall") {
    return (
      <ItemEntriesOverall
        overall={overall}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />
    );
  }

  return (
    <ItemEntriesSections
      sections={sections}
      expandedSection={expandedSection}
      setExpandedSection={setExpandedSection}
      selectedFilter={selectedFilter}
      setSelectedFilter={setSelectedFilter}
    />
  );
};

export default ItemEntries;