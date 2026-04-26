import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBudgetPerformance } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function BudgetReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: report, isLoading } = useQuery({
    queryKey: ['budget-performance', id],
    queryFn: () => fetchBudgetPerformance(id!).then((r) => r.data.data),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-20 text-center">Generating report...</div>
  if (!report) return <div className="p-20 text-center">Report not found.</div>

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/accounts/budgets')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget vs Actual Performance</h1>
            <p className="text-muted-foreground">
              Period: <span className="font-medium">{report.budget.fiscal_period.name}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Download size={16} />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.budgeted_amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Actual Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.actual_amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(report.variance)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {report.variance_percentage.toFixed(1)}% {report.variance < 0 ? 'Over' : 'Under'} Budget
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Category / Account</th>
              <th className="px-4 py-3 text-right font-medium">Budgeted</th>
              <th className="px-4 py-3 text-right font-medium">Actual</th>
              <th className="px-4 py-3 text-right font-medium">Variance</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-muted/30">
              <td className="px-4 py-4">
                <div className="font-bold text-primary">{report.budget.account.account_name}</div>
                <div className="text-xs text-muted-foreground">{report.budget.account.account_code}</div>
                {report.budget.cost_center && (
                  <Badge variant="outline" className="mt-1 text-[10px] uppercase font-bold">
                    {report.budget.cost_center.name}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-4 text-right font-mono">{formatCurrency(report.budgeted_amount)}</td>
              <td className="px-4 py-4 text-right font-mono">{formatCurrency(report.actual_amount)}</td>
              <td className={`px-4 py-4 text-right font-mono font-bold ${report.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(report.variance)}
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center">
                  {report.variance < 0 ? (
                    <TrendingUp size={18} className="text-red-600" />
                  ) : report.variance > 0 ? (
                    <TrendingDown size={18} className="text-green-600" />
                  ) : (
                    <Minus size={18} className="text-muted-foreground" />
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            <TrendingUp size={20} />
          </div>
          <div>
             <h4 className="font-bold text-sm">AI Financial Insight</h4>
             <p className="text-xs text-muted-foreground mt-1">
               {report.variance < 0 
                 ? `Your spending in ${report.budget.account.account_name} is exceeding the budget by ${Math.abs(report.variance_percentage).toFixed(1)}%. Consider reviewing the recent Journal Vouchers to identify potential savings.`
                 : `Great job! You are currently ${report.variance_percentage.toFixed(1)}% under budget for ${report.budget.account.account_name}. This surplus could be reallocated to other departments if needed.`}
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
