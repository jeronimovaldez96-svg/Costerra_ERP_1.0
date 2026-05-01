import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-200 selection:bg-primary-500/30">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopBar />
        
        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-hidden relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
