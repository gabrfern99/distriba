import { getInventoryById } from '@/features/estoque/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { InventoryDetailClient } from './inventory-detail-client'

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inventory = await getInventoryById(id)

  if (!inventory) notFound()

  const initialInventory = {
    id: inventory.id,
    code: inventory.code,
    status: inventory.status,
    notes: inventory.notes,
    userName: inventory.user.name ?? 'Usuário',
    createdAt: inventory.createdAt.toISOString(),
    completedAt: inventory.completedAt?.toISOString() ?? null,
    items: inventory.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      baseUnitLabel: item.product.baseUnit?.unitOfMeasure.abbreviation ?? item.product.baseUnitName,
      conversionFactor: Number(item.product.baseUnit?.conversionFactor ?? 1),
      systemStock: Number(item.systemStock),
      countedStock: Number(item.countedStock),
      difference: Number(item.difference),
      justification: item.justification,
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/estoque/inventario" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-muted-foreground">Detalhes do inventário</h1>
        </div>
      </div>

      <InventoryDetailClient initialInventory={initialInventory} />
    </div>
  )
}
