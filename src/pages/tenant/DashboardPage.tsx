import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/tenant'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertCircle,
  FileText,
  ArrowRight,
  Building2,
  UploadCloud,
  ChevronRight,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Link } from 'react-router-dom'

export default function TenantDashboardPage() {
  const { user } = useAuthStore()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await fetchDashboardSummary()
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4 h-96 animate-pulse" />
          <Card className="col-span-full lg:col-span-3 h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  const financials = summary?.financials
  const sales = summary?.sales
  const inventory = summary?.inventory
  const recentActivities = summary?.recent_activities || []

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Here's what's happening with your business today.
          </p>
        </div>
        <Link to="/data-migration">
          <Button
            variant="outline"
            className="gap-2 border-border/70 hover:bg-accent text-xs font-medium h-9"
          >
            <UploadCloud className="h-4 w-4 text-primary" />
            <span>Bulk Upload Data</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards with Antigravity Staggered Entrances & Floating Aura */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/accounts/reports/profit-and-loss" className="block group stagger-1">
          <Card className="hover:border-emerald-500/50 hover:shadow-[0_20px_45px_-10px_rgba(16,185,129,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Revenue</CardTitle>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 shadow-xs transition-all duration-300">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(financials?.revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Total revenue this month
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounts/reports/profit-and-loss" className="block group stagger-2">
          <Card className="hover:border-blue-500/50 hover:shadow-[0_20px_45px_-10px_rgba(59,130,246,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Profit</CardTitle>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 shadow-xs transition-all duration-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {formatCurrency(financials?.net_profit)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" /> Net profit after expenses
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/sales/orders" className="block group stagger-3">
          <Card className="hover:border-amber-500/50 hover:shadow-[0_20px_45px_-10px_rgba(245,158,11,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sales Orders</CardTitle>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 shadow-xs transition-all duration-300">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {sales?.total_orders}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" /> New orders this month
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/inventory/reports" className="block group stagger-4">
          <Card className="hover:border-rose-500/50 hover:shadow-[0_20px_45px_-10px_rgba(244,63,94,0.2)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Low Stock Items</CardTitle>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/20 shadow-xs transition-all duration-300">
                <AlertCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                {inventory?.low_stock_items}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" /> Items below reorder level
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Grid: Financial Summary & Recent Activities */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Comparison of revenue and expenses for the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-foreground">Revenue</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(financials?.revenue)}
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: financials?.revenue ? '100%' : '0%' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-foreground">Expenses</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(financials?.expenses)}
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-700"
                    style={{
                      width: financials?.revenue
                        ? `${Math.min((financials.expenses / financials.revenue) * 100, 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Net Profit</span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      financials?.net_profit && financials.net_profit >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(financials?.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest orders and transactions.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" asChild>
              <Link to="/activities" className="flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-xs">
                    <div className="mt-0.5 p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                      {activity.type === 'Sale Order' ? (
                        <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
                      ) : activity.type === 'Receipt' ? (
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{activity.reference}</p>
                        <time className="text-[10px] text-muted-foreground shrink-0">
                          {formatDate(activity.date)}
                        </time>
                      </div>
                      <p className="text-muted-foreground text-[11px] truncate">
                        {activity.description}
                        {activity.amount ? ` — ${formatCurrency(activity.amount)}` : ''}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <StatusBadge status={activity.status} />
                        <span className="text-[10px] text-muted-foreground/70">• {activity.type}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="p-3 bg-muted rounded-full mb-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">No recent activity found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150"
            asChild
          >
            <Link to="/accounts/journal-vouchers/new">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">New Voucher</div>
                <div className="text-[11px] text-muted-foreground">Create a journal entry</div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150"
            asChild
          >
            <Link to="/sales/orders/new">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">New Sale Order</div>
                <div className="text-[11px] text-muted-foreground">Process a customer order</div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150"
            asChild
          >
            <Link to="/inventory/items/new">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">Add Item</div>
                <div className="text-[11px] text-muted-foreground">Register new product</div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 items-start rounded-xl border-border/70 hover:border-primary/40 hover:bg-accent/50 text-left transition-all duration-150"
            asChild
          >
            <Link to="/sales/customers/new">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-foreground">New Customer</div>
                <div className="text-[11px] text-muted-foreground">Grow your business</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* Companies Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Your Companies</CardTitle>
            <CardDescription>Multi-company entities registered under your tenant.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to="/settings">Manage All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary?.companies && summary.companies.length > 0 ? (
              summary.companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/50 transition-all duration-150 group"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm truncate text-foreground">{company.name}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">{company.email || 'No email set'}</p>
                    {company.registration_number && (
                      <p className="text-[10px] mt-0.5 text-muted-foreground/80 font-mono">
                        REG: {company.registration_number}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center border-2 border-dashed border-border/60 rounded-xl">
                <Building2 className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">No companies found.</p>
                <Button variant="link" size="sm" className="text-xs mt-1" asChild>
                  <Link to="/settings">Create your first company</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
