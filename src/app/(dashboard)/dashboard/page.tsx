import { requireTenantAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { formatCurrency, formatDecimal } from '@/lib/utils'
import { MOVEMENT_TYPE_LABELS } from '@/lib/constants'
import Link from 'next/link'
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  ArrowUpDown,
  Plus,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const [
    totalProducts,
    lowStockProducts,
    salesToday,
    recentMovements,
    pendingOrders,
    monthlySales,
  ] = await Promise.all([
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, sku: true, currentStock: true, minStock: true, baseUnitName: true },
      orderBy: { currentStock: 'asc' },
    }),
    prisma.sale.aggregate({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.stockMovement.findMany({
      where: { tenantId },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.purchaseOrder.count({
      where: { tenantId, status: 'SENT' },
    }),
    prisma.sale.aggregate({
      where: {
        tenantId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ])

  const todayTotal = Number(salesToday._sum.totalAmount ?? 0)
  const monthTotal = Number(monthlySales._sum.totalAmount ?? 0)

  const lowStockFiltered = lowStockProducts
    .filter((p) => Number(p.currentStock) <= Number(p.minStock))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos</span>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <Link href="/estoque" className="text-xs text-primary hover:underline">Ver estoque →</Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estoque baixo</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{lowStockFiltered.length}</div>
          <span className="text-xs text-muted-foreground">produto(s) abaixo do mínimo</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendas hoje</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(todayTotal)}</div>
          <span className="text-xs text-muted-foreground">{salesToday._count} venda(s)</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendas do mês</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(monthTotal)}</div>
          <span className="text-xs text-muted-foreground">{monthlySales._count} venda(s)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alert */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Estoque crítico
            </h2>
            <Link href="/estoque?low=1" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {lowStockFiltered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Todos os produtos estão com estoque adequado
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lowStockFiltered.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-destructive">
                      {formatDecimal(Number(p.currentStock), 2)} {p.baseUnitName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      mín: {formatDecimal(Number(p.minStock), 2)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent movements */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              Movimentações recentes
            </h2>
            <Link href="/estoque/movimentacoes" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          {recentMovements.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma movimentação registrada
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentMovements.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{m.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {MOVEMENT_TYPE_LABELS[m.type as keyof typeof MOVEMENT_TYPE_LABELS]}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${m.type === 'EXIT' ? 'text-destructive' : 'text-green-600'}`}>
                    {m.type === 'EXIT' ? '-' : '+'}{formatDecimal(Number(m.quantity), 2)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold text-sm mb-3">Ações rápidas</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/vendas/nova"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova venda
          </Link>
          <Link
            href="/estoque/novo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo produto
          </Link>
          <Link
            href="/compras/novo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo pedido de compra
          </Link>
          <Link
            href="/estoque/inventario/novo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo inventário
          </Link>
          {pendingOrders > 0 && (
            <Link
              href="/compras"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {pendingOrders} pedido(s) aguardando
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
