import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ReportPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage?: number
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
}

export function ReportPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 25, 50, 100],
}: ReportPaginationProps) {
  if (totalItems <= 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-3 px-1 print:hidden">
      <div className="flex items-center gap-4">
        <span>
          Showing page <span className="text-foreground font-semibold">{currentPage}</span> of{' '}
          <span className="text-foreground font-semibold">{Math.max(1, totalPages)}</span> ({totalItems} total)
        </span>
        {onPerPageChange && perPage && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Rows per page:</span>
            <Select
              value={String(perPage)}
              onValueChange={(v) => onPerPageChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perPageOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs gap-1 rounded-lg"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </Button>
        <div className="text-xs font-medium px-2">
          {currentPage} / {Math.max(1, totalPages)}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs gap-1 rounded-lg"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
