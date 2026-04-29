import { getFeaturedProducts } from '@/features/configuracoes/featured-products-actions'
import { FeaturedProductsClient } from './featured-products-client'

export default async function ProdutosMaisVendidosPage() {
  const featured = await getFeaturedProducts()

  const initialFeatured = featured.map((fp) => ({
    id: fp.id,
    position: fp.position,
    showInPdv: fp.showInPdv,
    product: {
      id: fp.product.id,
      name: fp.product.name,
      sku: fp.product.sku,
      salePrice: Number(fp.product.salePrice),
      currentStock: Number(fp.product.currentStock),
      isActive: fp.product.isActive,
    },
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos Mais Vendidos</h1>
        <p className="text-muted-foreground text-sm">
          Configure a lista de destaques (máx. 20). Arraste para reordenar.
        </p>
      </div>
      <FeaturedProductsClient initialFeatured={initialFeatured} />
    </div>
  )
}
