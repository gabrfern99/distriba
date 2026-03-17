'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { createSale, completeSale } from '@/features/vendas/actions'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDecimal } from '@/lib/utils'
import { Trash2, Plus, Check, Search, ShoppingCart, Package, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BarcodeScanner } from '@/components/shared/barcode-scanner'
import { useHardwareScanner } from '@/hooks/use-hardware-scanner'

interface ProductUnit {
  id: string
  unitOfMeasure: { name: string; abbreviation: string }
  conversionFactor: number | { toString(): string }
  salePrice: number | { toString(): string }
}

interface Product {
  id: string
  name: string
  sku: string
  salePrice: number | { toString(): string }
  currentStock: number | { toString(): string }
  baseUnitName: string
  baseUnitId: string | null
  baseUnit: (ProductUnit & { unitOfMeasure: { name: string; abbreviation: string } }) | null
  productUnits: ProductUnit[]
}

interface CartItem {
  productId: string
  productName: string
  productSku: string
  unitName: string
  conversionFactor: number
  quantity: number
  unitPrice: number
  subtotal: number
}

export function PDV({ products }: { products: Product[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<{ id: string; name: string; abbreviation: string; conversionFactor: number; salePrice: number } | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('0')
  const [completing, setCompleting] = useState(false)

  const [state, formAction, isPending] = useActionState(createSale, null)

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0)

  useEffect(() => {
    if (state?.success && state.saleId) {
      toast('Venda criada! Confirmando...')
      handleComplete(state.saleId)
    }
    if (state?.error) toast(state.error, 'error')
  }, [state])

  useHardwareScanner(handleBarcodeScan)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function handleComplete(saleId: string) {
    setCompleting(true)
    try {
      const result = await completeSale(saleId)
      if ('error' in result && typeof result.error === 'string') {
        toast(result.error, 'error')
      } else {
        toast('Venda concluída com sucesso!')
        router.push('/vendas')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao finalizar venda'
      toast(msg, 'error')
    } finally {
      setCompleting(false)
    }
  }

  const suggestions = search
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 10)
    : []

  function handleSearchChange(value: string) {
    setSearch(value)
    setShowSuggestions(true)
    if (!value) {
      setSelectedProduct(null)
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const exact = products.find((p) => p.sku.toLowerCase() === search.toLowerCase())
      if (exact) {
        selectProduct(exact)
      } else if (suggestions.length === 1) {
        selectProduct(suggestions[0])
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  function handleBarcodeScan(code: string) {
    const exact = products.find((p) => p.sku === code)
    if (exact) {
      selectProduct(exact)
    } else {
      setSearch(code)
      setShowSuggestions(true)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }

  function getBaseUnit(product: Product): { id: string; name: string; abbreviation: string; conversionFactor: number; salePrice: number } | null {
    if (product.baseUnitId && product.baseUnit) {
      return {
        id: product.baseUnit.id,
        name: product.baseUnit.unitOfMeasure.name,
        abbreviation: product.baseUnit.unitOfMeasure.abbreviation,
        conversionFactor: Number(product.baseUnit.conversionFactor),
        salePrice: Number(product.baseUnit.salePrice),
      }
    }
    if (product.productUnits.length > 0) {
      const first = product.productUnits[0]
      return {
        id: first.id,
        name: first.unitOfMeasure.name,
        abbreviation: first.unitOfMeasure.abbreviation,
        conversionFactor: Number(first.conversionFactor),
        salePrice: Number(first.salePrice),
      }
    }
    return null
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product)
    const base = getBaseUnit(product)
    setSelectedUnit(base)
    setUnitPrice(base ? base.salePrice.toFixed(2) : Number(product.salePrice).toFixed(2))
    setSearch(product.name)
    setShowSuggestions(false)
    setTimeout(() => qtyInputRef.current?.focus(), 50)
  }

  function clearProduct() {
    setSelectedProduct(null)
    setSearch('')
    setQuantity('1')
    setUnitPrice('0')
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function handleUnitChange(value: string) {
    if (!selectedProduct) return
    const pu = selectedProduct.productUnits.find((u) => u.id === value)
    if (pu) {
      const unit = {
        id: pu.id,
        name: pu.unitOfMeasure.name,
        abbreviation: pu.unitOfMeasure.abbreviation,
        conversionFactor: Number(pu.conversionFactor),
        salePrice: Number(pu.salePrice),
      }
      setSelectedUnit(unit)
      setUnitPrice(unit.salePrice.toFixed(2))
    }
  }

  function addToCart() {
    if (!selectedProduct) {
      toast('Selecione um produto', 'error')
      return
    }
    const qty = parseFloat(quantity)
    const price = parseFloat(unitPrice)
    if (qty <= 0 || isNaN(qty)) {
      toast('Quantidade inválida', 'error')
      return
    }
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === selectedProduct.id &&
          item.unitName === (selectedUnit?.name ?? '') &&
          item.unitPrice === price,
      )
      if (existingIdx !== -1) {
        return prev.map((item, i) => {
          if (i !== existingIdx) return item
          const newQty = item.quantity + qty
          return { ...item, quantity: newQty, subtotal: Math.round(newQty * item.unitPrice * 100) / 100 }
        })
      }
      return [
        ...prev,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productSku: selectedProduct.sku,
          unitName: selectedUnit?.name ?? '',
          conversionFactor: selectedUnit?.conversionFactor ?? 1,
          quantity: qty,
          unitPrice: price,
          subtotal: Math.round(qty * price * 100) / 100,
        },
      ]
    })
    clearProduct()
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addToCart()
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const stock = selectedProduct ? Number(selectedProduct.currentStock) : 0

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
      {/* Left: product search + add panel */}
      <div className="xl:col-span-2 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Adicionar produto</h2>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">F2</span>
          </div>

          {/* Search input */}
          <div className="relative">
            <div className="flex flex-col gap-1">
              <label htmlFor="sku-search" className="text-sm font-medium text-foreground">
                SKU / Nome do produto
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    id="sku-search"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Escaneie ou digite nome/SKU..."
                    autoFocus
                    className="flex h-10 w-full rounded-md border border-border bg-background pl-9 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={clearProduct}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <BarcodeScanner onScan={handleBarcodeScan} />
              </div>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && search && !selectedProduct && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg overflow-hidden">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => selectProduct(p)}
                    className="w-full flex items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-primary">
                        {formatCurrency(Number(getBaseUnit(p)?.salePrice ?? p.salePrice))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDecimal(Number(p.currentStock), 2)} {getBaseUnit(p)?.abbreviation ?? p.baseUnitName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && search && !selectedProduct && suggestions.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado
              </div>
            )}
          </div>

          {/* Selected product card */}
          {selectedProduct && (
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{selectedProduct.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{selectedProduct.sku}</div>
                  <div className={`text-xs font-medium mt-1 ${stock <= 0 ? 'text-destructive' : 'text-green-700'}`}>
                    Estoque: {formatDecimal(stock, 2)} {getBaseUnit(selectedProduct)?.abbreviation ?? selectedProduct.baseUnitName}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-base font-bold text-primary">
                    {formatCurrency(Number(getBaseUnit(selectedProduct)?.salePrice ?? selectedProduct.salePrice))}
                  </div>
                </div>
              </div>

              {selectedProduct.productUnits.length > 0 && (
                <Select
                  id="unit"
                  label="Unidade de venda"
                  value={selectedUnit?.id ?? ''}
                  onChange={(e) => handleUnitChange(e.target.value)}
                >
                  {selectedProduct.productUnits.map((pu) => {
                    const isBase = pu.id === selectedProduct.baseUnitId
                    const baseAbbr = getBaseUnit(selectedProduct)?.abbreviation ?? selectedProduct.baseUnitName
                    return (
                      <option key={pu.id} value={pu.id}>
                        {pu.unitOfMeasure.name} ({pu.unitOfMeasure.abbreviation})
                        {isBase
                          ? ' · Base'
                          : ` · 1 ${pu.unitOfMeasure.abbreviation} = ${Number(pu.conversionFactor)} ${baseAbbr}`}
                      </option>
                    )
                  })}
                </Select>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Input
                    ref={qtyInputRef}
                    id="qty"
                    label="Quantidade"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={handleAddKeyDown}
                  />
                  {selectedUnit && selectedUnit.conversionFactor !== 1 && (
                    <p className="text-xs text-muted-foreground px-0.5">
                      = {parseFloat(((parseFloat(quantity) || 0) * selectedUnit.conversionFactor).toFixed(4))} {getBaseUnit(selectedProduct)?.abbreviation ?? selectedProduct.baseUnitName}
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
                  onKeyDown={handleAddKeyDown}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span>
                  Subtotal
                  {selectedUnit && selectedUnit.conversionFactor !== 1 && (
                    <span className="ml-1 text-xs">
                      ({parseFloat(((parseFloat(quantity) || 0) * selectedUnit.conversionFactor).toFixed(4))} {getBaseUnit(selectedProduct)?.abbreviation ?? selectedProduct.baseUnitName} em base)
                    </span>
                  )}
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(Math.round((parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0) * 100) / 100)}
                </span>
              </div>

              <Button onClick={addToCart} className="w-full" size="lg">
                <Plus className="h-4 w-4" />
                Adicionar ao pedido
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right: cart */}
      <div className="xl:col-span-3 space-y-4">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Carrinho</h2>
            {cart.length > 0 && (
              <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-medium">
                {cart.length} item(s)
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <ShoppingCart className="h-8 w-8 opacity-30" />
              <p className="text-sm">Carrinho vazio</p>
              <p className="text-xs opacity-70">Adicione produtos usando a busca ao lado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Produto</th>
                      <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground">Qtd</th>
                      <th className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground">Preço</th>
                      <th className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground">Subtotal</th>
                      <th className="px-3 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cart.map((item, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">{item.productSku} · {item.unitName}</div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm font-mono">
                          {formatDecimal(item.quantity, 3)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeFromCart(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors rounded-sm p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal ({cart.length} item(s))</span>
                  <span className="text-sm font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>

                <form action={formAction}>
                  <input type="hidden" name="items" value={JSON.stringify(cart)} />
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={isPending || completing}
                  >
                    <Check className="h-4 w-4" />
                    Finalizar venda — {formatCurrency(total)}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
