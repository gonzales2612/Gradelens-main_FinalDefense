"use client"

import * as React from "react"
import type { DistributionRow } from "@/components/bar-distribution"

// Utility to conditionally join classes (assuming you might have clsx/tailwind-merge)
// If you don't use a utility like cn(), you can keep using template literals.
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")

interface DistributionTableProps {
  rows: DistributionRow[]
  totalF?: number
  totalFx?: number
  className?: string
}

export const DistributionTable: React.FC<DistributionTableProps> = ({
  rows,
  totalF = 0,
  totalFx = 0,
  className = "",
}) => {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Container needs a defined height or max-height for sticky footer/header to work 
        within the scroll context. 
      */}
      <div className="overflow-auto relative w-full max-h-87.5">
        <table className="w-full text-sm caption-bottom">
          {/* STICKY HEADER */}
          <thead className="sticky top-0 z-20 bg-primary shadow-sm">
            <tr className="border-b border-border transition-colors">
              <th className="h-10 px-4 text-left align-middle font-medium text-primary-foreground">
                Score
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-primary-foreground w-25">
                f
              </th>
              <th className="h-10 px-4 text-right align-middle font-medium text-primary-foreground w-25">
                fx
              </th>
            </tr>
          </thead>

          {/* SCROLLABLE BODY */}
          <tbody className="[&_tr:last-child]:border-0">
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle font-medium text-foreground">
                    {row.score}
                  </td>
                  {/* tabular-nums ensures numbers align perfectly vertically */}
                  <td className="p-4 align-middle text-right tabular-nums text-foreground/80">
                    {row.f}
                  </td>
                  <td className="p-4 align-middle text-right tabular-nums text-foreground/80">
                    {row.fx ?? "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="h-24 text-center text-muted-foreground">
                  No results.
                </td>
              </tr>
            )}
          </tbody>

          {/* STICKY FOOTER */}
          <tfoot className="sticky bottom-0 z-20 bg-muted/80 backdrop-blur-sm border-t border-border font-medium">
            <tr>
              <td className="p-4 align-middle text-foreground">Total</td>
              <td className="p-4 align-middle text-right tabular-nums text-foreground">
                {totalF}
              </td>
              <td className="p-4 align-middle text-right tabular-nums text-foreground">
                {totalFx}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default DistributionTable