// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Root Application Component
// Minimal bootstrap — routes and UI will be added in Phase 2+.
// ────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom'

function DashboardPlaceholder(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">Costerra ERP</h1>
        <div className="mt-2 h-1 w-16 mx-auto rounded-full bg-blue-500" />
        <p className="mt-4 text-sm text-slate-400">v2.0 — Foundation Initialized</p>
        <p className="mt-1 text-xs text-slate-600">
          Drizzle ORM • React 19 • TypeScript Strict • Electron
        </p>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="*" element={<DashboardPlaceholder />} />
    </Routes>
  )
}
