'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/estoque', label: 'Produtos' },
  { href: '/estoque/movimentacoes', label: 'Movimentações' },
  { href: '/estoque/inventario', label: 'Inventário' },
  { href: '/estoque/unidades', label: 'Unidades' },
  { href: '/vendas', label: 'Vendas' },
  { href: '/vendas/nova', label: 'Nova Venda' },
  { href: '/compras', label: 'Pedidos de Compra' },
  { href: '/compras/novo', label: 'Novo Pedido' },
  { href: '/compras/fornecedores', label: 'Fornecedores' },
  { href: '/configuracoes', label: 'Empresa' },
  { href: '/configuracoes/perfil', label: 'Meu Perfil' },
  { href: '/configuracoes/usuarios', label: 'Usuários' },
]

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (open) onClose()
  }, [pathname]) // eslint-disable-line

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-background border-r border-border overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-primary">Distribuidora</span>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                pathname === link.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
