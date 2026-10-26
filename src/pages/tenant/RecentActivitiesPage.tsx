import { useQuery } from '@tanstack/react-query'
import { fetchActivities } from '@/api/tenant'
import { 
  Card, 
  CardContent, 
  CardHeader
} from '@/components/ui/card'
import { 
  ShoppingCart, 
  DollarSign, 
  FileText, 
  Search,
  ArrowLeft,
  X
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { useState, useMemo } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function RecentActivitiesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [event, setEvent] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, per_page: 20 }
    if (search.trim()) params.search = search.trim()
    if (event && event !== '__all__') params.event = event
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return params
  }, [page, search, event, dateFrom, dateTo])

  const { data, isLoading } = useQuery({
    queryKey: ['activities', queryParams],
    queryFn: () => fetchActivities(queryParams).then(res => res.data)
  })

  const activities = data?.data || []

  const hasFilters = Boolean(search || (event && event !== '__all__') || dateFrom || dateTo)

  const clearFilters = () => {
    setSearch('')
    setEvent('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Recent Activities</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            A complete audit trail of everything happening in your tenant.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/50 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-8 pr-8 bg-background h-9 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={event || '__all__'}
                onValueChange={(val) => {
                  setEvent(val === '__all__' ? '' : val)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-36 text-sm bg-background">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className="h-9 w-36 text-sm bg-background"
                  title="Date From"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className="h-9 w-36 text-sm bg-background"
                  title="Date To"
                />
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[150px]">Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-6 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <TableRow key={activity.id} className="group cursor-default hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(activity.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-secondary rounded-md">
                          {activity.type === 'Sale Order' ? (
                            <ShoppingCart className="h-3 w-3 text-orange-600" />
                          ) : activity.type === 'Receipt' ? (
                            <DollarSign className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <FileText className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <span className="text-xs font-medium">{activity.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {activity.reference}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[400px]">
                        <p className="truncate text-xs font-medium">{activity.description}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          By: {activity.causer_name || 'System'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {activity.amount ? formatCurrency(activity.amount) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                         activity.status === 'created' 
                           ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                           : activity.status === 'updated'
                           ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                           : activity.status === 'deleted'
                           ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                           : 'bg-secondary text-secondary-foreground'
                       }`}>
                         {activity.status}
                       </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-72 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-secondary rounded-full">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No activities found.</p>
                      {hasFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs gap-1.5">
                          <X className="h-3.5 w-3.5" /> Clear all filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {data && data.total > data.per_page && (
          <div className="p-4 border-t flex items-center justify-between bg-muted/50">
            <div className="text-xs text-muted-foreground">
              Showing {activities.length} of {data.total} activities
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-xs font-medium px-2">
                Page {page} of {data.last_page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.last_page, p + 1))}
                disabled={page === data.last_page}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
