import { useToastStore, type Toast } from '../../store/useToastStore'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const toastIcons = {
  success: <CheckCircle className="text-emerald-500" size={20} />,
  error: <AlertCircle className="text-red-500" size={20} />,
  info: <Info className="text-blue-500" size={20} />,
  warning: <AlertTriangle className="text-amber-500" size={20} />
}

const toastStyles = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/20 bg-red-500/10 text-red-100',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-100'
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-xl border p-4 shadow-glass backdrop-blur-xl',
        toastStyles[toast.type]
      )}
    >
      <div className="flex w-full items-start gap-3">
        <div className="shrink-0 pt-0.5">{toastIcons[toast.type]}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.description !== undefined && toast.description !== '' && (
            <p className="text-sm opacity-80">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => { removeToast(toast.id); }}
          className="shrink-0 rounded-full p-1 opacity-50 transition-opacity hover:bg-white/10 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  )
}

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse items-end gap-2 p-6 pointer-events-none sm:max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
