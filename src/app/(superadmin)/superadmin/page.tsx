import prisma from '@/lib/prisma'
import { Building2, Users, ShoppingCart, Package } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default async function SuperAdminDashboard() {
  const [tenantCount, userCount, saleCount, productCount, recentTenants] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.sale.count(),
    prisma.product.count(),
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, products: true } },
      },
    }),
  ])

  const metrics = [
    {
      label: 'Tenants',
      value: tenantCount,
      icon: Building2,
      href: '/superadmin/tenants',
      iconClass: 'text-blue-600',
      bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Usuários',
      value: userCount,
      icon: Users,
      href: '/superadmin/usuarios',
      iconClass: 'text-violet-600',
      bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      label: 'Vendas',
      value: saleCount,
      icon: ShoppingCart,
      href: null,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Produtos',
      value: productCount,
      icon: Package,
      href: null,
      iconClass: 'text-orange-600',
      bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema multi-tenant</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const content = (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                <div className={`h-8 w-8 rounded-lg ${m.bgClass} flex items-center justify-center`}>
                  <m.icon className={`h-4 w-4 ${m.iconClass}`} />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums tracking-tight">
                {m.value.toLocaleString('pt-BR')}
              </p>
            </>
          )

          if (m.href) {
            return (
              <Link
                key={m.label}
                href={m.href}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                {content}
              </Link>
            )
          }

          return (
            <div key={m.label} className="rounded-xl border border-border bg-card p-5">
              {content}
            </div>
          )
        })}
      </div>

      {/* Recent tenants */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Tenants recentes</h2>
          <Link href="/superadmin/tenants" className="text-xs text-primary hover:underline font-medium">
            Ver todos →
          </Link>
        </div>

        {recentTenants.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum tenant cadastrado.{' '}
            <Link href="/superadmin/tenants/novo" className="text-primary hover:underline">
              Criar primeiro tenant
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {tenant.slug} · {tenant._count.users} usuário(s) · {tenant._count.products}{' '}
                    produto(s)
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(tenant.createdAt)}
                  </span>
                  <Badge variant={tenant.isActive ? 'success' : 'destructive'}>
                    {tenant.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Link
                    href={`/superadmin/tenants/${tenant.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
