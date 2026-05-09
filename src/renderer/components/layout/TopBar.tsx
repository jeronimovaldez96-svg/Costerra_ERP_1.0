import { Moon, Sun, Database } from 'lucide-react'
import { useThemeStore } from '../../store/useThemeStore'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export function TopBar() {
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()

  // Simple Breadcrumbs logic
  const pathnames = location.pathname.split('/').filter((x) => x)
  const isDashboard = pathnames.length === 0

  return (
    <header className="h-16 flex-shrink-0 border-b border-white/5 bg-surface-base/50 backdrop-blur-md flex items-center justify-between px-6 drag-region">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-400 no-drag">
        {isDashboard ? (
          <span className="text-slate-200 font-medium">Dashboard</span>
        ) : (
          <>
            <span className="capitalize">{pathnames[0]}</span>
            {pathnames.length > 1 && (
              <>
                <span className="text-slate-600">/</span>
                <span className="capitalize text-slate-200 font-medium">
                  {pathnames[1]?.replace('-', ' ')}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 no-drag">
        {/* DB Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <Database size={12} /> Local DB Connected
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <motion.div
            initial={false}
            animate={{ rotate: theme === 'dark' ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </motion.div>
        </button>
      </div>
    </header>
  )
}
