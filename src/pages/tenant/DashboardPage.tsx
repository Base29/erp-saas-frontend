import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/tenant'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertCircle,
  FileText,
  ArrowRight,
  Building2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function TenantDashboardPage() {
  const { user } = useAuthStore()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await fetchDashboardSummary()
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 h-96 animate-pulse" />
          <Card className="col-span-3 h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  const financials = summary?.financials
  const sales = summary?.sales
  const inventory = summary?.inventory
  const recentActivities = summary?.recent_activities || []

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}. Here's what's happening with your business today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/accounts/reports/profit-and-loss" className="block group">
          <Card className="overflow-hidden transition-all group-hover:shadow-md group-hover:border-emerald-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 transition-colors">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financials?.revenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total revenue this month
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounts/reports/profit-and-loss" className="block group">
          <Card className="overflow-hidden transition-all group-hover:shadow-md group-hover:border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 transition-colors">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financials?.net_profit)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Net profit after expenses
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/sales/orders" className="block group">
          <Card className="overflow-hidden transition-all group-hover:shadow-md group-hover:border-orange-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400 group-hover:bg-orange-200 transition-colors">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales?.total_orders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                New orders this month
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/inventory/reports" className="block group">
          <Card className="overflow-hidden transition-all group-hover:shadow-md group-hover:border-rose-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full text-rose-600 dark:text-rose-400 group-hover:bg-rose-200 transition-colors">
                <AlertCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory?.low_stock_items}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Items below reorder level
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4 overflow-hidden">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Comparison of revenue and expenses for the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Revenue</span>
                  <span className="text-muted-foreground">{formatCurrency(financials?.revenue)}</span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: financials?.revenue ? '100%' : '0%' }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Expenses</span>
                  <span className="text-muted-foreground">{formatCurrency(financials?.expenses)}</span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-1000" 
                    style={{ 
                      width: financials?.revenue 
                        ? `${Math.min((financials.expenses / financials.revenue) * 100, 100)}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Net Profit</span>
                  <span className={`text-lg font-bold ${financials?.net_profit && financials.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(financials?.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest orders and transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 text-sm">
                    <div className="mt-1 p-2 bg-secondary rounded-lg">
                      {activity.type === 'Sale Order' ? (
                        <ShoppingCart className="h-4 w-4 text-orange-600" />
                      ) : activity.type === 'Receipt' ? (
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.reference}</p>
                        <time className="text-xs text-muted-foreground">{formatDate(activity.date)}</time>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {activity.description}
                        {activity.amount ? ` — ${formatCurrency(activity.amount)}` : ''}
                      </p>
                      <div className="flex items-center gap-2">
                         <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
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
                         <span className="text-[10px] text-muted-foreground">• {activity.type}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 bg-secondary rounded-full mb-4">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No recent activity found.</p>
                </div>
              )}
              
              <Button variant="ghost" className="w-full text-xs" asChild>
                <Link to="/activities" className="flex items-center gap-2">
                  View All Activities <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Companies</CardTitle>
              <CardDescription>Multi-company entities registered under your tenant.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Manage All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summary?.companies && summary.companies.length > 0 ? (
                summary.companies.map((company) => (
                  <div 
                    key={company.id} 
                    className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent transition-colors group relative"
                  >
                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{company.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{company.email || 'No email set'}</p>
                      {company.registration_number && (
                        <p className="text-[10px] mt-1 text-muted-foreground font-mono">
                          REG: {company.registration_number}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center border-2 border-dashed rounded-xl">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No companies found.</p>
                  <Button variant="link" size="sm" asChild>
                    <Link to="/settings">Create your first company</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 items-start" asChild>
            <Link to="/accounts/journal-vouchers/new">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">New Voucher</div>
                <div className="text-xs text-muted-foreground">Create a journal entry</div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 items-start" asChild>
            <Link to="/sales/orders/new">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">New Sale Order</div>
                <div className="text-xs text-muted-foreground">Process a customer order</div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 items-start" asChild>
            <Link to="/inventory/items/new">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                <Package className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Add Item</div>
                <div className="text-xs text-muted-foreground">Register new product</div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2 items-start" asChild>
            <Link to="/sales/customers/new">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">New Customer</div>
                <div className="text-xs text-muted-foreground">Grow your business</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
         <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" /> Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{inventory?.total_items}</div>
                  <p className="text-xs text-muted-foreground">Total items in catalog</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/inventory/items">Manage</Link>
                </Button>
              </div>
            </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Pending Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{sales?.pending_quotations}</div>
                  <p className="text-xs text-muted-foreground">Waiting for approval</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/sales/quotations">Review</Link>
                </Button>
              </div>
            </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Quick Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 italic">"Everything is looking good!"</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/accounts/reports/profit-and-loss">P&L Report</Link>
                </Button>
              </div>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
