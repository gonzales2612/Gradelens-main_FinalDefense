// features/report/components/PLEntriesSections.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChevronDown } from "@tabler/icons-react";
import { Loading } from "@/components/loading";
import DistributionBarChart from "@/components/bar-distribution";
import DistributionTable from "@/components/distribution-table";
import type { PLEntriesSection } from "@/features/report/types/reports.types";

interface Props {
  sections: PLEntriesSection[];
  expandedSection: string | null;
  setExpandedSection: (id: string | null) => void;
}

export const PLEntriesSections: React.FC<Props> = ({ 
  sections, 
  expandedSection, 
  setExpandedSection 
}) => {
  if (!sections || sections.length === 0) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loading text="Loading section data..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const { statistics, distribution, metadata } = section;
        const isExpanded = expandedSection === section.section_id;

        return (
          <Card key={section.section_id} className="border-border bg-card/50">
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.section_id)}
              className="w-full text-left"
            >
              <CardHeader className="cursor-pointer flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground">
                    {section.section_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metadata.scan_count} of {metadata.student_count} students scanned
                  </p>
                </div>
                <IconChevronDown
                  className={`transition-transform text-muted-foreground ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </CardHeader>
            </button>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
                <div className="rounded-lg bg-background p-3 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">Mean</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {statistics.mean.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">PL (%)</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {statistics.pl_percentage.toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">MPS</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {statistics.mps.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">Total F</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {statistics.total_f}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">Total FX</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {statistics.total_fx}
                  </p>
                </div>
              </div>

              {!isExpanded && (
                <div className="flex items-center justify-center py-6 px-4">
                  <div className="text-center text-muted-foreground text-sm">
                    Click to expand and view detailed score breakdown (
                    {distribution.length} levels)
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Showing {distribution.length} score levels (out of{" "}
                    {metadata.total_points} total points)
                  </div>

                  <div className="space-y-2 mb-6 border p-5 rounded-md">
                    <p className="text-xs font-semibold text-foreground mb-3">
                      Distribution (f)
                    </p>
                    <div className="mb-2">
                      <DistributionBarChart
                        data={distribution.map((d) => ({
                          ...d,
                          score: String(d.score),
                        }))}
                        height={140}
                        maxTicks={30}
                        label="Frequency"
                      />
                    </div>
                  </div>

                  <DistributionTable
                    rows={distribution}
                    totalF={statistics.total_f}
                    totalFx={statistics.total_fx}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PLEntriesSections;