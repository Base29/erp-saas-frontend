import { useQuery } from '@tanstack/react-query'
import { fetchActivities } from '@/api/tenant'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { 
  ShoppingCart, 
  DollarSign, 
  FileText, 
  Search,
  Filter,
  ArrowLeft,
  Calendar
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'

export default function RecentActivitiesPage() {
  const [page, setPage] = useState(1)
  
  const { data, isLoading } = useQuery({
    queryKey: ['activities', page],
    queryFn: () => fetchActivities({ page, per_page: 20 }).then(res => res.data)
  })

  const activities = data?.data || []
  const meta = data?.meta

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference or description..."
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
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
                    <TableCell>
                      <div className="text-sm">
                        {activity.description}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Triggered by {activity.causer_name || 'System'}
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
                      <p className="text-muted-foreground">No activities found for this period.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {meta && meta.total > meta.per_page && (
          <div className="p-4 border-t flex items-center justify-between bg-muted/50">
            <div className="text-xs text-muted-foreground">
              Showing {activities.length} of {meta.total} activities
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
                Page {page} of {meta.last_page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
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
