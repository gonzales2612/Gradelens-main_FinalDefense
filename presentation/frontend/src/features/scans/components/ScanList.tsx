import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Scan } from "@packages/types/scans/scans.types";

export function ScanList({
  scans,
  onSelect
}: {
  scans: Scan[]
  onSelect: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scans</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {scans.length === 0 && (
          <p className="text-sm text-muted-foreground">No scans found</p>
        )}

        {scans.map(scan => (
          <Button
            key={scan.scan_id}
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onSelect(scan.scan_id)}
          >
            <span className="font-mono text-xs">
              {scan.scan_id.slice(0, 8)}
            </span>
            <span className="ml-2 text-muted-foreground">
              {scan.status}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
