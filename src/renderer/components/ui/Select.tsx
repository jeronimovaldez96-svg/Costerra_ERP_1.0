// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Styled Select Component
// Mirrors Input.tsx API for consistent form UX.
// ────────────────────────────────────────────────────────

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | undefined
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-slate-100',
            'border-slate-700/50 backdrop-blur-md transition-colors appearance-none',
            'focus:outline-none focus:border-border-glow focus:ring-1 focus:ring-border-glow',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {children}
        </select>

        {/* Chevron indicator */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {error && (
          <span className="absolute -bottom-5 left-1 text-xs text-red-500">
            {error}
          </span>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
