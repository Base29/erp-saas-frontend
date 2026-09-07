import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ImportError, ImportWarning } from '@/api/import'

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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing preview of up to {rows.length} rows</span>
        <div className="flex gap-2">
          {errors.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.length} error{errors.length > 1 ? 's' : ''}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" /> {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </Badge>
          )}
          {errors.length === 0 && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Ready to Import
            </Badge>
          )}
        </div>
      </div>

      <div className="max-h-[320px] overflow-auto border rounded-md">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted sticky top-0 border-b">
            <tr>
              <th className="p-2 w-12 text-center text-muted-foreground font-semibold">#</th>
              <th className="p-2 w-20 text-center text-muted-foreground font-semibold">Status</th>
              {visibleHeaders.map((h) => (
                <th key={h} className="p-2 whitespace-nowrap font-medium text-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const lineNum = row._line_number ?? (idx + 2)
              const rowErrors = errorsByRow.get(lineNum) || []
              const rowWarnings = warningsByRow.get(lineNum) || []
              const hasErrors = rowErrors.length > 0
              const hasWarnings = rowWarnings.length > 0

              return (
                <tr
                  key={idx}
                  className={
                    hasErrors
                      ? 'bg-destructive/10'
                      : hasWarnings
                      ? 'bg-amber-50/50 dark:bg-amber-950/20'
                      : 'hover:bg-muted/50'
                  }
                >
                  <td className="p-2 text-center font-mono text-muted-foreground">{lineNum}</td>
                  <td className="p-2 text-center">
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
                    <td key={h} className="p-2 whitespace-nowrap max-w-[200px] truncate" title={String(row[h] ?? '')}>
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 max-h-40 overflow-y-auto text-xs space-y-1">
          <div className="font-semibold text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Please fix the following errors before proceeding:
          </div>
          {errors.map((err, i) => (
            <div key={i} className="text-destructive/90 pl-4">
              • <span className="font-mono font-semibold">Row {err.row}</span> ({err.field}): {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
