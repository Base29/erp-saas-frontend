import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchManufacturingOverview,
  restartMachine,
  type DailyProductionEntry,
  type ProductionDowntimeLog,
} from '@/api/manufacturing'
import { isExtensionActive } from '@/utils/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Factory,
  Cpu,
  AlertTriangle,
  Package,
  Layers,
  Clock,
  Play,
  ClipboardList,
  Sparkles,
  RefreshCw,
  Box,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ManufacturingOverviewPage() {
  const queryClient = useQueryClient()
  const [restartTarget, setRestartTarget] = useState<ProductionDowntimeLog | null>(null)
  const isPlasticsActive = isExtensionActive('plastics_molding')

  const { data, isLoading } = useQuery({
    queryKey: ['manufacturing-overview'],
    queryFn: () => fetchManufacturingOverview().then((r) => r.data.data),
  })

  const restartMutation = useMutation({
    mutationFn: (id: string) => restartMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-overview'] })
      setRestartTarget(null)
      toast.success('Machine marked as restarted')
    },
    onError: () => {
      toast.error('Failed to restart machine')
    },
  })

  const kpis = data?.kpis

  return (
    <div className="p-6 md:p-8 space-y-8 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Factory className="h-7 w-7 text-primary" />
              Manufacturing Control Center
            </h1>
            {isPlasticsActive && (
              <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                Plastics & Injection Molding Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Production planning, shop-floor execution, downtime monitoring, and packing control.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link to="/manufacturing/plans">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Production Plans
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/manufacturing/daily-production">
              <Play className="h-4 w-4 mr-1.5" />
              Daily Production Entry
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Target Achievement
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${kpis?.achievement_percentage ?? 100}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Good units vs. expected run
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Active Machines
              <Cpu className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : kpis?.active_machines ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis?.maintenance_machines ?? 0} in maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Downtime Today
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isLoading ? '...' : `${kpis?.total_downtime_minutes ?? 0}m`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded machine stoppages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Reject Rate
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${kpis?.reject_rate_percentage ?? 0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis?.total_rejected_today ?? 0} rejected units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Packed Cartons
              <Package className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : kpis?.packed_cartons_today ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis?.packed_pieces_today ?? 0} total pieces
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Material Shortage Alerts (if any) */}
      {(kpis?.material_shortage_alerts ?? 0) > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Material Shortage Alert
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {kpis?.material_shortage_alerts} production plan line item(s) have raw material or machine capacity deficits.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20" asChild>
            <Link to="/manufacturing/plans">Inspect Plans</Link>
          </Button>
        </div>
      )}

      {/* Active Machine Stoppages Alert Table */}
      {data?.active_downtimes && data.active_downtimes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active Machine Stoppages (Needs Attention)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Machines currently stopped that have not logged a restart time.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Stopped At</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.active_downtimes.map((log: ProductionDowntimeLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-foreground">
                      {log.machine?.name} ({log.machine?.code})
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize border-amber-500/40 text-amber-700 dark:text-amber-300">
                        {log.reason.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.stopped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.remarks || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setRestartTarget(log)}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Log Restart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Navigation Quick Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          to="/manufacturing/work-centers"
          className="p-4 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-2"
        >
          <Cpu className="h-6 w-6 text-primary" />
          <span className="text-xs font-semibold">Work Centers</span>
        </Link>
        <Link
          to="/manufacturing/boms"
          className="p-4 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-2"
        >
          <Layers className="h-6 w-6 text-blue-500" />
          <span className="text-xs font-semibold">BOM Master</span>
        </Link>
        <Link
          to="/manufacturing/orders"
          className="p-4 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-2"
        >
          <ClipboardList className="h-6 w-6 text-emerald-500" />
          <span className="text-xs font-semibold">Work Orders</span>
        </Link>
        <Link
          to="/manufacturing/packing"
          className="p-4 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-2"
        >
          <Box className="h-6 w-6 text-indigo-500" />
          <span className="text-xs font-semibold">Packing Runs</span>
        </Link>

        {isPlasticsActive ? (
          <>
            <Link
              to="/manufacturing/moulds"
              className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex flex-col items-center text-center gap-2"
            >
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">Mould Master</span>
            </Link>
            <Link
              to="/manufacturing/crusher"
              className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex flex-col items-center text-center gap-2"
            >
              <RefreshCw className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">Crusher Regrind</span>
            </Link>
          </>
        ) : (
          <Link
            to="/manufacturing/reports"
            className="p-4 rounded-xl border border-border/70 bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-2 col-span-2 sm:col-span-1"
          >
            <TrendingUp className="h-6 w-6 text-amber-500" />
            <span className="text-xs font-semibold">Reports Suite</span>
          </Link>
        )}
      </div>

      {/* Recent Production Entries */}
      <Card>
        <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Production Runs</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Shop-floor entries recorded across shifts</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/manufacturing/daily-production">View All Entries</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Shift</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Product / Component</TableHead>
                <TableHead className="text-right">Good Qty</TableHead>
                <TableHead className="text-right">Rejects</TableHead>
                <TableHead className="text-right">Achievement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.recent_entries && data.recent_entries.length > 0 ? (
                data.recent_entries.map((entry: DailyProductionEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{entry.production_date}</div>
                      <span className="text-muted-foreground capitalize">{entry.shift}</span>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {entry.machine?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.item?.item_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(entry.good_quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-right text-rose-500">
                      {Number(entry.rejected_quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      <span className={Number(entry.achievement_percentage) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {entry.achievement_percentage}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No production entries recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restart Machine Confirmation Dialog */}
      <Dialog open={!!restartTarget} onOpenChange={(open) => !open && setRestartTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restart Work Center</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            Mark <span className="font-semibold text-foreground">{restartTarget?.machine?.name}</span> as restarted now? Downtime duration will be auto-calculated.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRestartTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => restartTarget && restartMutation.mutate(restartTarget.id)}
            >
              Confirm Restart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
