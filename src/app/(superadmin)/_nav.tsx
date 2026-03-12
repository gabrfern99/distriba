'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/superadmin/tenants', label: 'Tenants', icon: Building2, exact: false },
  { href: '/superadmin/usuarios', label: 'Usuários', icon: Users, exact: false },
]

export function SuperAdminNav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <>
        {NAV_ITEMS.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              {label}
            </Link>
          )
        })}
      </>
    )
  }

  return (
    <div className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
