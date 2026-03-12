'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[SuperAdmin Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message || 'Ocorreu um erro inesperado ao carregar esta página.'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          Ir ao início
        </Link>
      </div>
    </div>
  )
}
