import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string | undefined
  type: ToastType
  duration?: number | undefined
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) =>
    { set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })); }
}))

// Convenience methods for easy importing without hooking
export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    { useToastStore.getState().addToast({ type: 'success', title, description, duration }); },
  error: (title: string, description?: string, duration?: number) =>
    { useToastStore.getState().addToast({ type: 'error', title, description, duration }); },
  info: (title: string, description?: string, duration?: number) =>
    { useToastStore.getState().addToast({ type: 'info', title, description, duration }); },
  warning: (title: string, description?: string, duration?: number) =>
    { useToastStore.getState().addToast({ type: 'warning', title, description, duration }); }
}
