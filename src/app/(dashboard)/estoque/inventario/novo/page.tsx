import { getProducts } from '@/features/estoque/actions'
import { InventoryForm } from './inventory-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoInventarioPage() {
  const { products: rawProducts } = await getProducts()
  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    baseUnitLabel: p.baseUnit?.unitOfMeasure.abbreviation ?? p.baseUnitName,
    conversionFactor: Number(p.baseUnit?.conversionFactor ?? 1),
    currentStock: Number(p.currentStock),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/estoque/inventario" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Inventário</h1>
          <p className="text-sm text-muted-foreground">Contagem física do estoque</p>
        </div>
      </div>
      <InventoryForm products={products} />
    </div>
  )
}
