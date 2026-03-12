import { getProducts } from '@/features/estoque/actions'
import { serializeProduct } from '@/lib/utils'
import { PDV } from './pdv'

export default async function NovaVendaPage() {
  const { products: rawProducts } = await getProducts()
  const products = rawProducts.map(serializeProduct)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nova Venda — PDV</h1>
      <PDV products={products} />
    </div>
  )
}
