import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export function PageContainer({ children, className, title }: { children: ReactNode, className?: string, title?: string }) {
  return (
    <div className={cn('flex flex-col flex-1 h-full p-8 overflow-y-auto drag-region', className)}>
      <div className="no-drag flex flex-col flex-1">
        {title && <h1 className="text-3xl font-bold tracking-tight text-white mb-6">{title}</h1>}
        {children}
      </div>
    </div>
  )
}
