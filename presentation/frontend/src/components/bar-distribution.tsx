"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export type DistributionRow = {
  score: number | string
  f: number
  fx?: number
}

interface DistributionBarProps {
  data: DistributionRow[]
  height?: number
  maxTicks?: number
  label?: string
}

export const DistributionBarChart: React.FC<DistributionBarProps> = ({
  data,
  height = 120,
  maxTicks = 20,
  label = "Frequency",
}) => {
  const config = React.useMemo(() => ({ views: { label } }), [label])

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart
        data={data}
        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
        barCategoryGap="10%"
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="score"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          interval={Math.max(0, Math.floor(data.length / Math.max(3, maxTicks)))}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="f"
              labelFormatter={(val) => `Score ${val}`}
            />
          }
        />
        <Bar dataKey="f" fill="var(--chart-1)" />
      </BarChart>
    </ChartContainer>
  )
}

export default DistributionBarChart
