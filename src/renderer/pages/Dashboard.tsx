import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/layout/GlassCard'
import { BarChart3, TrendingUp, Users, Package } from 'lucide-react'

export function Dashboard() {
  return (
    <PageContainer title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: '$45,231.89', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Active Clients', value: '124', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Products in Stock', value: '8,439', icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Monthly Growth', value: '+14.2%', icon: BarChart3, color: 'text-primary-400', bg: 'bg-primary-400/10' },
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
