import { getProductById, getUnits } from '@/features/estoque/actions'
import { notFound } from 'next/navigation'
import { serializeProduct } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EditProductTabs } from './edit-product-tabs'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [product, units] = await Promise.all([
    getProductById(id),
    getUnits(),
  ])

  if (!product) notFound()
  const serialized = serializeProduct(product)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/estoque" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">{product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={product.isActive ? 'success' : 'destructive'}>
            {product.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <Link
            href={`/estoque/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Visualizar
          </Link>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EditProductTabs product={serialized as any} units={units} />
    </div>
  )
}
