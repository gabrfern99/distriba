import { getPurchaseOrders } from '@/features/compras/actions'
import { getSuppliers } from '@/features/compras/actions'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PurchaseOrderStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ShoppingBag, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; supplierId?: string; page?: string }>
}) {
  const { status, supplierId, page } = await searchParams
  const [{ orders, total }, { suppliers }] = await Promise.all([
    getPurchaseOrders(supplierId, status, Number(page) || 1),
    getSuppliers(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de Compra</h1>
          <p className="text-muted-foreground text-sm">{total} pedido(s)</p>
        </div>
        <Link
          href="/compras/novo"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo pedido
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap gap-2">
        <select
          name="supplierId"
          defaultValue={supplierId}
          className="flex h-9 rounded-md border border-border bg-background px-3 py-1 text-sm"
        >
          <option value="">Todos os fornecedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="flex h-9 rounded-md border border-border bg-background px-3 py-1 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="SENT">Enviado</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <button type="submit" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nenhum pedido encontrado" />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono">{order.code}</td>
                  <td className="px-4 py-3">{order.supplier.name}</td>
                  <td className="px-4 py-3">
                    <PurchaseOrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(order.totalAmount.toString())}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/compras/${order.id}`} className="text-primary hover:underline text-xs">
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
