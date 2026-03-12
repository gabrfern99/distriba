'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, type?: 'success' | 'error') => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-right-full',
              t.type === 'success'
                ? 'bg-background border-green-200 text-green-800'
                : 'bg-background border-red-200 text-red-800',
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)}>
              <X className="h-3 w-3 opacity-50 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
