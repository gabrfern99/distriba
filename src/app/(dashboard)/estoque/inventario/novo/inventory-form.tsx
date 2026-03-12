'use client'

import { useActionState, useState, useEffect } from 'react'
import { createInventory } from '@/features/estoque/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { formatDecimal } from '@/lib/utils'
import { Search } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  baseUnitName: string
  currentStock: number
}

interface InventoryItem {
  productId: string
  productName: string
  productSku: string
  systemStock: number
  countedStock: string
  justification: string
}

export function InventoryForm({ products }: { products: Product[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(createInventory, null)

  const [search, setSearch] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (state?.success) {
      toast('Inventário criado com sucesso!')
      router.push('/estoque/inventario')
    }
    if (state?.error) {
      toast(state.error, 'error')
    }
  }, [state])

  const filteredProducts = products.filter(
    (p) =>
      !items.some((i) => i.productId === p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())),
  )

  function addProduct(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        systemStock: product.currentStock,
        countedStock: String(product.currentStock),
        justification: '',
      },
    ])
    setSearch('')
  }

  function updateItem(index: number, field: 'countedStock' | 'justification', value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    const form = new FormData()
    form.set('notes', notes)
    const serializedItems = items.map((item) => ({
      productId: item.productId,
      countedStock: parseFloat(item.countedStock) || 0,
      justification: item.justification,
    }))
    form.set('items', JSON.stringify(serializedItems))
    formAction(form)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Buscar produto para adicionar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou SKU do produto..."
            className="flex h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {search && filteredProducts.length > 0 && (
          <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-y-auto shadow-sm">
            {filteredProducts.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm transition-colors"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.sku} — Estoque: {formatDecimal(p.currentStock, 2)} {p.baseUnitName}
                </div>
              </button>
            ))}
          </div>
        )}
        {search && filteredProducts.length === 0 && (
          <p className="text-sm text-muted-foreground px-1">Nenhum produto encontrado</p>
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-right px-4 py-3 font-medium">Sist.</th>
                <th className="text-right px-4 py-3 font-medium w-32">Contado</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Justificativa</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, i) => {
                const diff = (parseFloat(item.countedStock) || 0) - item.systemStock
                return (
                  <tr key={item.productId} className="hover:bg-muted/10">
                    <td className="px-4 py-2">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.productSku}</div>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {formatDecimal(item.systemStock, 2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.countedStock}
                          onChange={(e) => updateItem(i, 'countedStock', e.target.value)}
                          className="h-8 w-28 rounded-md border border-border bg-background px-2 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        {item.countedStock !== '' && diff !== 0 && (
                          <span className={`text-xs font-medium ${diff > 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {diff > 0 ? '+' : ''}{formatDecimal(diff, 2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      <input
                        value={item.justification}
                        onChange={(e) => updateItem(i, 'justification', e.target.value)}
                        placeholder="Motivo da diferença..."
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Adicione produtos usando a busca acima
        </div>
      )}

      <Textarea
        id="notes"
        label="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observações sobre o inventário..."
      />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleSubmit}
          loading={isPending}
          disabled={items.length === 0}
        >
          Criar inventário
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/estoque/inventario')}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
