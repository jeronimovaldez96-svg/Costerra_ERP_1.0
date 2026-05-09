import { useState, useEffect } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/layout/GlassCard'
import { TrendingUp, Users, Package, DollarSign, BarChart3 } from 'lucide-react'
import { toast } from '../store/useToastStore'

export function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    grossMargin: 0,
    totalStockValue: 0,
    totalActiveLeads: 0
  })

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await window.api.invoke<any>('dashboard:metrics')
        setMetrics(data)
      } catch (error) {
        toast.error('Failed to load dashboard metrics', (error as Error).message)
      }
    }
    loadMetrics()
  }, [])

  return (
    <PageContainer title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: `$${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Gross Margin', value: `${metrics.grossMargin.toFixed(1)}%`, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Total Cost of Stock Value', value: `$${metrics.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Total Active Leads', value: metrics.totalActiveLeads.toString(), icon: Users, color: 'text-primary-400', bg: 'bg-primary-400/10' },
        ].map((stat) => (
          <GlassCard key={stat.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="h-96 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
          <p>Analytics charts will be implemented here.</p>
        </div>
      </GlassCard>
    </PageContainer>
  )
}
