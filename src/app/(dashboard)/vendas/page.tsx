import { getSales } from '@/features/vendas/actions'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { SaleStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ShoppingCart, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q, status, page } = await searchParams
  const { sales, total, pages } = await getSales(q, status, Number(page) || 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-muted-foreground text-sm">{total} venda(s)</p>
        </div>
        <Link
          href="/vendas/nova"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova venda
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por código..."
          className="flex h-9 w-48 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          name="status"
          defaultValue={status}
          className="flex h-9 rounded-md border border-border bg-background px-3 py-1 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="OPEN">Aberta</option>
          <option value="COMPLETED">Concluída</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Filtrar
        </button>
      </form>

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Nenhuma venda encontrada"
          action={
            <Link href="/vendas/nova" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <Plus className="h-4 w-4" /> Nova venda
            </Link>
          }
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Itens</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{sale.code}</td>
                  <td className="px-4 py-3">
                    <SaleStatusBadge status={sale.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(sale.totalAmount.toString())}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{sale._count.items}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDateTime(sale.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/vendas/${sale.id}`} className="text-primary hover:underline text-xs">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
