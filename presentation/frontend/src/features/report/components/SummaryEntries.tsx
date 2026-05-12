// features/report/components/SummaryEntries.tsx
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/loading";
import type { PLEntriesSection } from "@/features/report/types/reports.types";

interface SummaryEntriesProps {
  sections: PLEntriesSection[];
  isLoading?: boolean;
  error?: string | null;
}

interface SummaryRow {
  section_name: string;
  num_examinees: number;
  num_items: number;
  hso: number;
  lso: number;
  total_scores: number;
  mean: number;
  pl: number;
  mps: number;
}

interface SummaryFooter {
  total_examinees: number;
  max_hso: number;
  min_lso: number;
  sum_total_scores: number;
  aggregate_mean: number;
  aggregate_pl: number;
  aggregate_mps: number;
}

export const SummaryEntries: React.FC<SummaryEntriesProps> = ({ 
  sections, 
  isLoading = false,
  error = null 
}) => {
  // Compute summary rows and footer
  const { summaryRows, footer } = useMemo(() => {
    if (!sections || sections.length === 0) {
      return { 
        summaryRows: [], 
        footer: null 
      };
    }

    // Build rows for each section
    const rows: SummaryRow[] = sections.map((section) => ({
      section_name: section.section_name,
      num_examinees: section.metadata.scan_count,
      num_items: section.metadata.number_of_items,
      hso: section.metadata.hso,
      lso: section.metadata.lso,
      total_scores: section.statistics.total_fx,
      mean: section.statistics.mean,
      pl: section.statistics.pl_percentage,
      mps: section.statistics.mps,
    }));

    // Calculate footer aggregates
    let totalExaminees = 0;
    let maxHSO = -Infinity;
    let minLSO = Infinity;
    let sumTotalScores = 0;
    let aggregateTotalF = 0;
    let aggregateTotalFx = 0;

    for (const section of sections) {
      totalExaminees += section.metadata.scan_count;
      sumTotalScores += section.statistics.total_fx;
      aggregateTotalF += section.statistics.total_f;
      aggregateTotalFx += section.statistics.total_fx;

      // Only consider sections with scans for HSO/LSO
      if (section.metadata.scan_count > 0) {
        if (section.metadata.hso > maxHSO) {
          maxHSO = section.metadata.hso;
        }
        if (section.metadata.lso < minLSO) {
          minLSO = section.metadata.lso;
        }
      }
    }

    // Handle edge case: no scans in any section
    if (maxHSO === -Infinity) maxHSO = 0;
    if (minLSO === Infinity) minLSO = 0;

    // Calculate aggregate Mean, PL, MPS
    const aggregateMean = aggregateTotalF > 0 ? aggregateTotalFx / aggregateTotalF : 0;
    
    // Get total_points from first section (same for all sections)
    const totalPoints = sections[0]?.metadata.total_points || 0;
    const aggregatePL = totalPoints > 0 ? (aggregateMean / totalPoints) * 100 : 0;
    const aggregateMPS = (100 - aggregatePL) * 0.02 + aggregatePL;

    const footerData: SummaryFooter = {
      total_examinees: totalExaminees,
      max_hso: maxHSO,
      min_lso: minLSO,
      sum_total_scores: sumTotalScores,
      aggregate_mean: parseFloat(aggregateMean.toFixed(2)),
      aggregate_pl: parseFloat(aggregatePL.toFixed(2)),
      aggregate_mps: parseFloat(aggregateMPS.toFixed(2)),
    };

    return { summaryRows: rows, footer: footerData };
  }, [sections]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loading text="Loading summary..." />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (summaryRows.length === 0) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              No data available for summary. Please generate a report first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Summary Report</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aggregated performance statistics across all sections
        </p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-left text-xs font-semibold text-foreground">
                  Section
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  # Examinees
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  # Items
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  HSO
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  LSO
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  Total Scores
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  Mean
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  PL (%)
                </th>
                <th className="p-3 text-right text-xs font-semibold text-foreground">
                  MPS
                </th>
              </tr>
            </thead>

            <tbody>
              {summaryRows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3 text-sm text-foreground font-medium">
                    {row.section_name}
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.num_examinees}
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.num_items}
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.hso.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.lso.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.total_scores.toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.mean.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right text-primary font-semibold">
                    {row.pl.toFixed(2)}%
                  </td>
                  <td className="p-3 text-sm text-right text-foreground">
                    {row.mps.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>

            {footer && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/70">
                  <td className="p-3 text-sm font-bold text-foreground">
                    Ave
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-foreground">
                    {footer.total_examinees}
                  </td>
                  <td className="p-3 text-sm text-right text-muted-foreground">
                    —
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-foreground">
                    {footer.max_hso.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-foreground">
                    {footer.min_lso.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-foreground">
                    {footer.sum_total_scores.toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-foreground">
                    {footer.aggregate_mean.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-primary">
                    {footer.aggregate_pl.toFixed(2)}%
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-foreground">
                    {footer.aggregate_mps.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Legend / Notes */}
        <div className="mt-6 p-4 bg-muted/30 rounded-md border border-border/50">
          <p className="text-xs font-semibold text-foreground mb-2">Notes:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>HSO:</strong> Highest Score Obtained (maximum score across all examinees in section)</li>
            <li><strong>LSO:</strong> Lowest Score Obtained (minimum score across all examinees in section)</li>
            <li><strong>Total Scores:</strong> Sum of all scores (∑FX) in the section</li>
            <li><strong>Mean:</strong> Average score calculated as Total Scores / Number of Examinees</li>
            <li><strong>PL:</strong> Performance Level percentage = (Mean / Total Points) × 100</li>
            <li><strong>MPS:</strong> Mean Percentage Score = (100 - PL) × 0.02 + PL</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryEntries;