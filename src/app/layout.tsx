import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Sistema de Gestão - Distribuidora',
  description: 'Sistema de gestão multi-tenant para distribuidoras',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
