'use client'

import { useActionState, useState, useEffect } from 'react'
import { createPurchaseOrder } from '@/features/compras/actions'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'


interface Supplier { id: string; name: string }
interface Product {
  id: string
  name: string
  sku: string
  baseUnitName: string
  productUnits: Array<{
    unitOfMeasure: { name: string; abbreviation: string }
    conversionFactor: { toString(): string }
  }>
}

interface OrderItem {
  productId: string
  productName: string
  unitName: string
  conversionFactor: number
  quantity: number
  unitPrice: number
  subtotal: number
}

export function PurchaseOrderForm({
  suppliers,
  products,
}: {
  suppliers: Supplier[]
  products: Product[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<OrderItem[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedUnit, setSelectedUnit] = useState({ name: '', conversionFactor: 1 })
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('0')

  const [state, formAction, isPending] = useActionState(createPurchaseOrder, null)

  const total = items.reduce((sum, i) => sum + i.subtotal, 0)

  const currentProduct = products.find((p) => p.id === selectedProduct)

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: p.sku,
  }))

  useEffect(() => {
    if (state?.success && state.orderId) {
      toast('Pedido criado!')
      router.push(`/compras/${state.orderId}`)
    }
    if (state?.error) toast(state.error, 'error')
  }, [state])

  useEffect(() => {
    if (currentProduct) {
      setSelectedUnit({ name: currentProduct.baseUnitName, conversionFactor: 1 })
    }
  }, [selectedProduct])

  function addItem() {
    if (!currentProduct) { toast('Selecione um produto', 'error'); return }
    const qty = parseFloat(quantity)
    const price = parseFloat(unitPrice)
    if (qty <= 0 || isNaN(qty)) { toast('Quantidade inválida', 'error'); return }

    setItems((prev) => [
      ...prev,
      {
        productId: currentProduct.id,
        productName: currentProduct.name,
        unitName: selectedUnit.name,
        conversionFactor: selectedUnit.conversionFactor,
        quantity: qty,
        unitPrice: price,
        subtotal: Math.round(qty * price * 100) / 100,
      },
    ])
    setSelectedProduct('')
    setQuantity('1')
    setUnitPrice('0')
  }

  function handleUnitChange(value: string) {
    if (!currentProduct) return
    if (value === '__base__') {
      setSelectedUnit({ name: currentProduct.baseUnitName, conversionFactor: 1 })
    } else {
      const pu = currentProduct.productUnits.find(
        (u) => u.unitOfMeasure.abbreviation === value,
      )
      if (pu) {
        setSelectedUnit({
          name: pu.unitOfMeasure.name,
          conversionFactor: parseFloat(pu.conversionFactor.toString()),
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        <Combobox
          label="Fornecedor *"
          name="supplierId"
          required
          options={supplierOptions}
          value={selectedSupplier}
          onChange={setSelectedSupplier}
          placeholder="Selecione o fornecedor"
          searchPlaceholder="Pesquisar fornecedor..."
        />

        <input type="hidden" name="items" value={JSON.stringify(items)} />

        {/* Adicionar item */}
        <div className="p-4 rounded-lg border border-border bg-muted/10 space-y-4">
          <h3 className="font-medium">Adicionar item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Combobox
              label="Produto"
              options={productOptions}
              value={selectedProduct}
              onChange={setSelectedProduct}
              placeholder="Selecione..."
              searchPlaceholder="Pesquisar por nome ou SKU..."
            />

            {currentProduct && (
              <Select
                id="unit"
                label="Unidade de compra"
                onChange={(e) => handleUnitChange(e.target.value)}
              >
                <option value="__base__">{currentProduct.baseUnitName} (unidade base)</option>
                {currentProduct.productUnits.map((pu) => (
                  <option key={pu.unitOfMeasure.abbreviation} value={pu.unitOfMeasure.abbreviation}>
                    {pu.unitOfMeasure.name} (1 {pu.unitOfMeasure.abbreviation} = {parseFloat(pu.conversionFactor.toString())} {currentProduct.baseUnitName})
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Input
                id="qty"
                label="Quantidade"
                type="number"
                step="0.001"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {selectedUnit.conversionFactor !== 1 && parseFloat(quantity) > 0 && (
                <p className="text-xs text-muted-foreground px-0.5">
                  = {parseFloat((parseFloat(quantity) * selectedUnit.conversionFactor).toFixed(4))} {currentProduct?.baseUnitName}
                </p>
              )}
            </div>
            <Input
              id="price"
              label="Preço unit. (R$)"
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Adicionar item
          </Button>
        </div>

        {/* Tabela de itens */}
        {items.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Produto</th>
                  <th className="text-left px-4 py-3 font-medium">Unidade</th>
                  <th className="text-right px-4 py-3 font-medium">Qtd</th>
                  <th className="text-right px-4 py-3 font-medium">Preço</th>
                  <th className="text-right px-4 py-3 font-medium">Subtotal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{item.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unitName}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold">
                  <td colSpan={4} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right text-primary">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={isPending} disabled={items.length === 0}>
            Criar pedido
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/compras')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
