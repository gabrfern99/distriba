import { getPurchaseOrderById } from '@/features/compras/actions'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PurchaseOrderStatusBadge } from '@/components/shared/status-badge'
import { PurchaseOrderActions } from './purchase-order-actions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getPurchaseOrderById(id)

  if (!order) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/compras" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pedido {order.code}</h1>
          <p className="text-sm text-muted-foreground">
            Fornecedor: {order.supplier.name} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PurchaseOrderStatusBadge status={order.status} />
          <PurchaseOrderActions orderId={order.id} status={order.status} />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Produto</th>
              <th className="text-left px-4 py-3 font-medium">Unidade</th>
              <th className="text-right px-4 py-3 font-medium">Qtd</th>
              <th className="text-right px-4 py-3 font-medium">Preço unit.</th>
              <th className="text-right px-4 py-3 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{item.productName}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.unitName}</td>
                <td className="px-4 py-3 text-right">{parseFloat(item.quantity.toString())}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice.toString())}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal.toString())}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right font-bold">Total</td>
              <td className="px-4 py-3 text-right font-bold text-primary">
                {formatCurrency(order.totalAmount.toString())}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
