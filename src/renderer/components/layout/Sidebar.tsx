import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  ShoppingCart, 
  Truck, 
  Box, 
  FileText,
  Briefcase
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Products & Inventory',
    items: [
      { name: 'Products', path: '/inventory/products', icon: Package },
      { name: 'Suppliers', path: '/inventory/suppliers', icon: Truck },
      { name: 'Purchase Orders', path: '/inventory/purchase-orders', icon: FileText },
      { name: 'Live Stock', path: '/inventory/stock', icon: Box },
    ]
  },
  {
    title: 'Sales & CRM',
    items: [
      { name: 'Clients', path: '/sales/clients', icon: Users },
      { name: 'Sales Leads', path: '/sales/leads', icon: Briefcase },
      { name: 'Quotes', path: '/sales/quotes', icon: FileText },
      { name: 'Invoices', path: '/sales/invoices', icon: ShoppingCart },
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings },
    ]
  }
]

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-surface-base backdrop-blur-md flex flex-col drag-region h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 shadow-glow flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <span className="font-bold tracking-wide text-white">Costerra</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 no-drag">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive 
                        ? 'bg-primary-500/10 text-primary-400' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    )
                  }
                >
                  <item.icon size={18} />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-white/5 text-xs text-slate-500 text-center">
        v2.0.0
      </div>
    </aside>
  )
}
