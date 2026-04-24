import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-slate-100',
            'border-slate-700/50 backdrop-blur-md transition-colors',
            'focus:outline-none focus:border-border-glow focus:ring-1 focus:ring-border-glow',
            'placeholder:text-slate-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <span className="absolute -bottom-5 left-1 text-xs text-red-500">
            {error}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
