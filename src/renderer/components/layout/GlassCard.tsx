import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function GlassCard({ children, className, noPadding = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-surface-base backdrop-blur-xl',
        'border border-border-glass shadow-glass',
        !noPadding && 'p-6',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
