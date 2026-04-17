'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Settings,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

interface NavChild {
  label: string
  href: string
}

interface NavItem {
  label: string
  href?: string
  icon: typeof LayoutDashboard
  children?: NavChild[]
  roles?: string[]
}

const allNavItems: NavItem[] = [
  // {
  //   label: 'Dashboard',
  //   href: '/dashboard',
  //   icon: LayoutDashboard,
  //   roles: ['OWNER', 'ADMIN', 'OPERATOR'],
  // },
  {
    label: 'Estoque',
    icon: Package,
    children: [
      { label: 'Produtos', href: '/estoque' },
      { label: 'Movimentações', href: '/estoque/movimentacoes' },
      { label: 'Inventário', href: '/estoque/inventario' },
      { label: 'Unidades', href: '/estoque/unidades' },
    ],
  },
  {
    label: 'Vendas',
    icon: ShoppingCart,
    roles: ['OWNER', 'ADMIN', 'OPERATOR'],
    children: [
      { label: 'Lista de Vendas', href: '/vendas' },
      { label: 'Nova Venda (PDV)', href: '/vendas/nova' },
    ],
  },
   {
     label: 'Compras',
     icon: ShoppingBag,
     roles: ['OWNER', 'ADMIN', 'OPERATOR'],
     children: [
       { label: 'Pedidos de Compra', href: '/compras' },
       { label: 'Novo Pedido', href: '/compras/novo' },
       { label: 'Fornecedores', href: '/compras/fornecedores' },
     ],
   },
  {
    label: 'Configurações',
    icon: Settings,
    roles: ['OWNER', 'ADMIN', 'OPERATOR'],
    children: [
      { label: 'Empresa', href: '/configuracoes' },
      { label: 'Meu Perfil', href: '/configuracoes/perfil' },
      { label: 'Usuários', href: '/configuracoes/usuarios' },
    ],
  },
]

function getNavItems(tenantRole?: string): NavItem[] {
  return allNavItems.filter((item) => !item.roles || (tenantRole && item.roles.includes(tenantRole)))
}

export function Sidebar({ tenantRole, tenantName, tenantLogoUrl }: { tenantRole?: string; tenantName?: string; tenantLogoUrl?: string | null }) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>(['Estoque', 'Vendas', 'Compras'])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar h-screen sticky top-0 overflow-y-auto shrink-0">
      <div className="flex h-14 items-center px-5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden">
            {tenantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenantLogoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-primary-foreground text-xs font-bold">
                {(tenantName ?? 'D').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="font-semibold text-foreground truncate">{tenantName ?? 'Distribuidora'}</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {getNavItems(tenantRole).map((item) => {
          if (!item.children) {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          }

          const isOpen = openMenus.includes(item.label)
          const hasActiveChild = item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                  hasActiveChild
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {isOpen && (
                <div className="ml-6 mt-0.5 mb-1 border-l border-border pl-3 space-y-0.5">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block rounded-md px-2.5 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'text-primary font-medium bg-primary/10'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
