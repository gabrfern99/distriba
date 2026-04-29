import { getPurchaseOrderById } from '@/features/compras/actions'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PurchaseOrderDetailClient } from './purchase-order-detail-client'

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getPurchaseOrderById(id)

  if (!order) notFound()

  const initialOrder = {
    id: order.id,
    code: order.code,
    status: order.status as 'DRAFT' | 'SENT' | 'COMPLETED' | 'CANCELLED',
    supplierName: order.supplier?.name ?? null,
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    sentAt: order.sentAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitName: item.unitName,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      conversionFactor: Number(item.conversionFactor),
      baseQuantity: Number(item.baseQuantity),
      subtotal: Number(item.subtotal),
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/compras" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-muted-foreground">Detalhes do pedido de compra</h1>
        </div>
      </div>

      <PurchaseOrderDetailClient initialOrder={initialOrder} />
    </div>
  )
}
