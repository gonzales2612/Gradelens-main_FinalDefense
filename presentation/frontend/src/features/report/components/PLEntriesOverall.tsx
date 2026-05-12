// features/report/components/PLEntriesOverall.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/loading";
import DistributionBarChart from "@/components/bar-distribution";
import DistributionTable from "@/components/distribution-table";
import type { IPLEntriesOverall } from "@/features/report/types/reports.types";

interface Props {
  overall?: IPLEntriesOverall | null;
}

export const PLEntriesOverall: React.FC<Props> = ({ overall }) => {
  if (!overall) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loading text="Loading overall data..." />
        </CardContent>
      </Card>
    );
  }

  const { statistics, distribution, metadata } = overall;

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Overall Performance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aggregated results across all sections
        </p>
      </CardHeader>

      <CardContent>
        {/* Summary Statistics */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 mb-6">
          <div className="rounded-lg bg-background p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Students Scanned</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {metadata.scan_count} / {metadata.student_count}
            </p>
          </div>
          <div className="rounded-lg bg-background p-3 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Mean</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {statistics.mean.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
            <p className="text-xs font-medium text-primary">PL (%)</p>
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

        {/* Distribution Visualization */}
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Showing {distribution.length} score levels (out of {metadata.total_points} total points)
          </div>

          <div className="space-y-2 mb-6 border p-5 rounded-md">
            <p className="text-xs font-semibold text-foreground mb-3">
              Overall Distribution (f)
            </p>
            <div className="mb-2">
              <DistributionBarChart
                data={distribution.map((d) => ({
                  ...d,
                  score: String(d.score),
                }))}
                height={180}
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
      </CardContent>
    </Card>
  );
};

export default PLEntriesOverall;