'use client'

import { logout } from '@/features/auth/actions'
import { LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { MobileNav } from './mobile-nav'

interface HeaderProps {
  userName?: string
  tenantName?: string
}

export function Header({ userName, tenantName }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {tenantName && (
            <span className="hidden sm:block text-sm text-muted-foreground">{tenantName}</span>
          )}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:block">{userName}</span>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="icon" type="submit" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
