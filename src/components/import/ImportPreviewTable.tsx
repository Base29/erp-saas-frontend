import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ImportError, ImportWarning } from '@/api/import'
import { cn } from '@/lib/utils'

interface Props {
  headers: string[]
  rows: Array<Record<string, any>>
  errors: ImportError[]
  warnings: ImportWarning[]
}

export default function ImportPreviewTable({ headers, rows, errors, warnings }: Props) {
  // Map errors and warnings by row number
  const errorsByRow = React.useMemo(() => {
    const map = new Map<number, ImportError[]>()
    errors.forEach((err) => {
      const list = map.get(err.row) || []
      list.push(err)
      map.set(err.row, list)
    })
    return map
  }, [errors])

  const warningsByRow = React.useMemo(() => {
    const map = new Map<number, ImportWarning[]>()
    warnings.forEach((w) => {
      const list = map.get(w.row) || []
      list.push(w)
      map.set(w.row, list)
    })
    return map
  }, [warnings])

  // Filter out internal metadata headers like _line_number
  const visibleHeaders = headers.filter((h) => !h.startsWith('_'))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span>Showing preview of up to {rows.length} rows</span>
        <div className="flex gap-2">
          {errors.length > 0 && (
            <Badge variant="destructive" className="gap-1 rounded-full shadow-2xs">
              <AlertCircle className="h-3 w-3" /> {errors.length} error{errors.length > 1 ? 's' : ''}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="outline" className="gap-1 rounded-full border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-2xs">
              <AlertTriangle className="h-3 w-3" /> {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </Badge>
          )}
          {errors.length === 0 && (
            <Badge variant="success" className="gap-1 rounded-full shadow-2xs">
              <CheckCircle2 className="h-3 w-3" /> Ready to Import
            </Badge>
          )}
        </div>
      </div>

      <div className="max-h-[320px] overflow-auto border border-border/70 rounded-xl bg-card/70 backdrop-blur-md shadow-subtle">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-muted/60 backdrop-blur-md sticky top-0 border-b border-border/70">
            <tr>
              <th className="p-2.5 w-12 text-center text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">#</th>
              <th className="p-2.5 w-20 text-center text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Status</th>
              {visibleHeaders.map((h) => (
                <th key={h} className="p-2.5 whitespace-nowrap font-semibold text-foreground/90 uppercase text-[11px] tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row, idx) => {
              const lineNum = row._line_number ?? (idx + 2)
              const rowErrors = errorsByRow.get(lineNum) || []
              const rowWarnings = warningsByRow.get(lineNum) || []
              const hasErrors = rowErrors.length > 0
              const hasWarnings = rowWarnings.length > 0

              return (
                <tr
                  key={idx}
                  className={cn(
                    "transition-colors duration-150",
                    hasErrors
                      ? 'bg-destructive/10 hover:bg-destructive/15'
                      : hasWarnings
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'hover:bg-primary/[0.03]'
                  )}
                >
                  <td className="p-2.5 text-center font-mono text-muted-foreground text-[11px]">{lineNum}</td>
                  <td className="p-2.5 text-center">
                    {hasErrors ? (
                      <span title={rowErrors.map((e) => `${e.field}: ${e.message}`).join(' | ')}>
                        <AlertCircle className="h-4 w-4 text-destructive mx-auto inline" />
                      </span>
                    ) : hasWarnings ? (
                      <span title={rowWarnings.map((w) => `${w.field}: ${w.message}`).join(' | ')}>
                        <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto inline" />
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto inline" />
                    )}
                  </td>
                  {visibleHeaders.map((h) => (
                    <td key={h} className="p-2.5 whitespace-nowrap text-foreground/90 tabular-nums">
                      {row[h] !== undefined && row[h] !== null ? String(row[h]) : ''}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
