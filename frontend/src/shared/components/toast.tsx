import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastContextValue } from './use-toast.ts'

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: ToastItem['tone']) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3400)
  }, [])

  const value = useMemo<ToastContextValue>(() => ({
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className={`toast toast-${toast.tone}`}>{toast.message}</p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}