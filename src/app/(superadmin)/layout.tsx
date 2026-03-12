import { auth } from '@/features/auth/auth'
import { redirect } from 'next/navigation'
import { logout } from '@/features/auth/actions'
import { Shield, LogOut } from 'lucide-react'
import { ToastProvider } from '@/components/ui/toast'
import { SuperAdminNav } from './_nav'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.globalRole !== 'SUPER_ADMIN') {
    redirect('/')
  }

  const initial = (session.user.name ?? session.user.email ?? 'A')[0].toUpperCase()

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-muted/30">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar fixed inset-y-0 left-0 z-30">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Super Admin</p>
              <p className="text-xs text-muted-foreground mt-0.5">Distribuidora</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4">
            <SuperAdminNav />
          </nav>

          {/* User footer */}
          <div className="border-t border-border px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair da conta
              </button>
            </form>
          </div>
        </aside>

        {/* Top bar — mobile */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold flex-1">Super Admin</span>
          <nav className="flex items-center gap-1">
            <SuperAdminNav mobile />
          </nav>
          <form action={logout}>
            <button
              type="submit"
              title="Sair"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </header>

        {/* Main content */}
        <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
          <main className="flex-1 p-4 lg:p-8 pt-[calc(3.5rem+1rem)] lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
