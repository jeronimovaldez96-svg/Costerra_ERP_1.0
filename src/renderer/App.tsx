// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Root Application Component
// ────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastProvider } from './components/ui/ToastProvider'
import { AppLayout } from './components/layout/AppLayout'

// Pages
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/inventory/Products'
import { Suppliers } from './pages/inventory/Suppliers'
import { PurchaseOrders } from './pages/inventory/PurchaseOrders'
import { Stock } from './pages/inventory/Stock'

// Sales & CRM
import { Clients } from './pages/sales/Clients'
import { Leads } from './pages/sales/Leads'
import { Quotes } from './pages/sales/Quotes'
import { Invoices } from './pages/sales/Invoices'
import { Settings } from './pages/Settings'

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          {/* Inventory */}
          <Route path="/inventory/products" element={<Products />} />
          <Route path="/inventory/suppliers" element={<Suppliers />} />
          <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/inventory/stock" element={<Stock />} />

          {/* Sales & CRM */}
          <Route path="/sales/clients" element={<Clients />} />
          <Route path="/sales/leads" element={<Leads />} />
          <Route path="/sales/quotes" element={<Quotes />} />
          <Route path="/sales/invoices" element={<Invoices />} />

          {/* System */}
          <Route path="/settings" element={<Settings />} />

          {/* 404 Fallback */}
          <Route path="*" element={<div className="p-8 text-white text-center">404 Not Found</div>} />
        </Route>
      </Routes>
      <ToastProvider />
    </ErrorBoundary>
  )
}
