import { getSuppliers } from '@/features/compras/actions'
import { getProducts } from '@/features/estoque/actions'
import { serializeProduct } from '@/lib/utils'
import { PurchaseOrderForm } from './purchase-order-form'

export default async function NovoPedidoPage() {
  const [{ suppliers }, { products: rawProducts }] = await Promise.all([
    getSuppliers(),
    getProducts(),
  ])
  const products = rawProducts.map(serializeProduct)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Pedido de Compra</h1>
      <PurchaseOrderForm suppliers={suppliers} products={products} />
    </div>
  )
}
