'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { createSale, completeSale } from '@/features/vendas/actions'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDecimal } from '@/lib/utils'
import { Trash2, Check, Search, ShoppingCart, X, AlertTriangle, Minus, Plus, Star } from 'lucide-react'
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

interface AvailableUnit {
  id: string
  name: string
  abbreviation: string
  conversionFactor: number
  salePrice: number
}

interface CartItem {
  productId: string
  productName: string
  productSku: string
  unitId: string
  unitName: string
  conversionFactor: number
  quantity: number
  quantityStr: string
  unitPrice: number
  unitPriceStr: string
  subtotal: number
  availableUnits: AvailableUnit[]
  baseUnitAbbr: string
}

interface FeaturedProduct {
  productId: string
  name: string
  sku: string
  salePrice: number
}

export function PDV({ products, featuredProducts = [] }: { products: Product[]; featuredProducts?: FeaturedProduct[] }) {
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const finalizeFormRef = useRef<HTMLFormElement>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ index: number; name: string } | null>(null)
  const [finalizeConfirm, setFinalizeConfirm] = useState(false)

  const [state, formAction, isPending] = useActionState(createSale, null)

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0)

  const cartForSubmission = cart.map(({ productId, unitName, conversionFactor, quantity, unitPrice }) => ({
    productId,
    unitName,
    conversionFactor,
    quantity,
    unitPrice,
  }))

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      if (finalizeConfirm || deleteConfirm !== null) return
      if (cart.length === 0) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setFinalizeConfirm(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finalizeConfirm, deleteConfirm, cart.length])

  useEffect(() => {
    if (deleteConfirm === null) return
    const captured = deleteConfirm
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        setDeleteConfirm(null)
        setCart((prev) => prev.filter((_, i) => i !== captured.index))
      }
      if (e.key === 'Escape') setDeleteConfirm(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteConfirm])

  useEffect(() => {
    if (!finalizeConfirm) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        setFinalizeConfirm(false)
        finalizeFormRef.current?.requestSubmit()
      }
      if (e.key === 'Escape') setFinalizeConfirm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finalizeConfirm])

  async function handleComplete(saleId: string) {
    setCompleting(true)
    try {
      const result = await completeSale(saleId)
      if ('error' in result && typeof result.error === 'string') {
        toast(result.error, 'error')
      } else {
        toast('Venda concluída com sucesso!')
        setCart([])
        setSearch('')
        searchInputRef.current?.focus()
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
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (finalizeConfirm || deleteConfirm !== null) return
    if (e.key === 'Enter') {
      if (!search && cart.length > 0) {
        searchInputRef.current?.blur()
        setFinalizeConfirm(true)
        return
      }
      const exact = products.find((p) => p.sku.toLowerCase() === search.toLowerCase())
      if (exact) {
        selectProduct(exact)
      } else if (suggestions.length === 1) {
        selectProduct(suggestions[0])
      }
    }
    if (e.key === 'Escape') setShowSuggestions(false)
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

  function getBaseUnit(product: Product): AvailableUnit | null {
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
    const base = getBaseUnit(product)
    const availableUnits: AvailableUnit[] = product.productUnits.map((pu) => ({
      id: pu.id,
      name: pu.unitOfMeasure.name,
      abbreviation: pu.unitOfMeasure.abbreviation,
      conversionFactor: Number(pu.conversionFactor),
      salePrice: Number(pu.salePrice),
    }))
    const price = base ? base.salePrice : Number(product.salePrice)
    const baseUnitAbbr = base?.abbreviation ?? product.baseUnitName

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.unitId === (base?.id ?? ''),
      )
      if (existingIdx !== -1) {
        return prev.map((item, i) => {
          if (i !== existingIdx) return item
          const newQty = item.quantity + 1
          return {
            ...item,
            quantity: newQty,
            quantityStr: String(newQty),
            subtotal: Math.round(newQty * item.unitPrice * 100) / 100,
          }
        })
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitId: base?.id ?? '',
          unitName: base?.name ?? '',
          conversionFactor: base?.conversionFactor ?? 1,
          quantity: 1,
          quantityStr: '1',
          unitPrice: price,
          unitPriceStr: price.toFixed(2),
          subtotal: price,
          availableUnits,
          baseUnitAbbr,
        },
      ]
    })

    setSearch('')
    setShowSuggestions(false)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function updateCartItemUnit(index: number, unitId: string) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const unit = item.availableUnits.find((u) => u.id === unitId)
        if (!unit) return item
        return {
          ...item,
          unitId: unit.id,
          unitName: unit.name,
          conversionFactor: unit.conversionFactor,
          unitPrice: unit.salePrice,
          unitPriceStr: unit.salePrice.toFixed(2),
          subtotal: Math.round(item.quantity * unit.salePrice * 100) / 100,
        }
      }),
    )
  }

  function updateCartItemQty(index: number, str: string) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const qty = parseFloat(str) || 0
        return {
          ...item,
          quantity: qty,
          quantityStr: str,
          subtotal: Math.round(qty * item.unitPrice * 100) / 100,
        }
      }),
    )
  }

  function updateCartItemPrice(index: number, str: string) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const price = parseFloat(str) || 0
        return {
          ...item,
          unitPrice: price,
          unitPriceStr: str,
          subtotal: Math.round(item.quantity * price * 100) / 100,
        }
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search panel */}
      <div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Buscar produto</h2>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">F2</span>
          </div>

          <div className="relative">
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
                  placeholder="Escaneie ou busque nome/SKU..."
                  autoFocus
                  className="flex h-10 w-full rounded-md border border-border bg-background pl-9 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setShowSuggestions(false)
                      searchInputRef.current?.focus()
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <BarcodeScanner onScan={handleBarcodeScan} />
            </div>

            {showSuggestions && search && suggestions.length > 0 && (
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
            {showSuggestions && search && suggestions.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado
              </div>
            )}
          </div>

          {cart.length > 0 && !search && (
            <p className="text-xs text-muted-foreground text-center px-2 py-1.5 bg-muted/50 rounded-md">
              Pressione{' '}
              <kbd className="font-mono bg-background border border-border rounded px-1 py-0.5 text-xs">
                Enter
              </kbd>{' '}
              com a busca vazia para finalizar a venda
            </p>
          )}
        </div>
      </div>

      {/* Featured quick-add */}
      {featuredProducts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-yellow-500" />
            <h2 className="font-semibold text-sm">Destaques</h2>
            <span className="text-xs text-muted-foreground">clique para adicionar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {featuredProducts.map((fp) => {
              const full = products.find((p) => p.id === fp.productId)
              const displayPrice = full
                ? Number(getBaseUnit(full)?.salePrice ?? full.salePrice)
                : fp.salePrice
              return (
                <button
                  key={fp.productId}
                  type="button"
                  onClick={() => full && selectProduct(full)}
                  disabled={!full}
                  className="flex flex-col items-start gap-0.5 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors px-3 py-2 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-medium leading-tight max-w-[120px] truncate">{fp.name}</span>
                  <span className="text-[11px] text-primary font-semibold">{formatCurrency(displayPrice)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Cart */}
      <div>
        <div
          className="rounded-xl border border-border bg-card flex flex-col overflow-hidden"
          style={{ minHeight: '420px' }}
        >
          {/* Cart header — sticky so total + finalize stay visible while scrolling */}
          <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-3 border-b border-border flex-shrink-0 bg-card">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-semibold">Carrinho</h2>
            {cart.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                {cart.length} item(s)
              </span>
            )}
            {cart.length > 0 && (
              <div className="ml-auto flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">Total</p>
                  <p className="text-xl font-bold text-primary leading-tight">{formatCurrency(total)}</p>
                </div>
                <form ref={finalizeFormRef} action={formAction}>
                  <input type="hidden" name="items" value={JSON.stringify(cartForSubmission)} />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFinalizeConfirm(true)}
                    loading={isPending || completing}
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Finalizar venda
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Cart body */}
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <ShoppingCart className="h-8 w-8 opacity-30" />
              <p className="text-sm">Carrinho vazio</p>
              <p className="text-xs opacity-70">Escaneie ou busque um produto para adicionar</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">
                      Produto
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground">
                      Unidade
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground">
                      Qtd
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground">
                      Preço Unit.
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground">
                      Subtotal
                    </th>
                    <th className="px-3 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-sm leading-tight">{item.productName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.productSku}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.availableUnits.length > 1 ? (
                          <select
                            value={item.unitId}
                            onChange={(e) => updateCartItemUnit(i, e.target.value)}
                            className="text-xs border border-border rounded-md px-1.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full min-w-[72px] max-w-[110px]"
                          >
                            {item.availableUnits.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.abbreviation}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">{item.unitName || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCartItemQty(i, String(Math.max(1, item.quantity - 1)))
                            }
                            className="h-7 w-7 rounded-md border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={item.quantityStr}
                            onChange={(e) => updateCartItemQty(i, e.target.value)}
                            className="text-sm text-center border border-border rounded-md px-1 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-12 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartItemQty(i, String(item.quantity + 1))}
                            className="h-7 w-7 rounded-md border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPriceStr}
                          onChange={(e) => updateCartItemPrice(i, e.target.value)}
                          className="text-sm text-right border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-24 font-mono block ml-auto"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ index: i, name: item.productName })}
                          className="text-muted-foreground hover:text-destructive transition-colors rounded-sm p-0.5"
                          title="Remover item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total footer — mobile only (sticky header handles desktop) */}
          <div className="flex-shrink-0 border-t border-border px-5 py-4 bg-card sm:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Total a pagar
                </p>
                <p className="text-3xl font-bold text-primary leading-none mt-1">
                  {formatCurrency(total)}
                </p>
                {cart.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {cart.length} item(s) · {cart.reduce((s, it) => s + it.quantity, 0).toFixed(0)} unid.
                  </p>
                )}
              </div>

              {cart.length > 0 && (
                <form ref={finalizeFormRef} action={formAction}>
                  <input
                    type="hidden"
                    name="items"
                    value={JSON.stringify(cartForSubmission)}
                  />
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setFinalizeConfirm(true)}
                    loading={isPending || completing}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Finalizar venda
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 rounded-xl border border-border bg-card shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-destructive/10 p-2 shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Remover item</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Remover <strong>{deleteConfirm.name}</strong> do carrinho?
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const idx = deleteConfirm.index
                  setDeleteConfirm(null)
                  setCart((prev) => prev.filter((_, i) => i !== idx))
                }}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize confirmation modal */}
      {finalizeConfirm && (() => {
        const outOfStockItems = cart.filter(item => {
          const product = products.find(p => p.id === item.productId)
          if (!product) return false
          return Number(product.currentStock) < item.quantity * item.conversionFactor
        })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setFinalizeConfirm(false)}
            />
            <div className="relative z-10 rounded-xl border border-border bg-card shadow-xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Finalizar venda</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confirmar venda de{' '}
                    <strong className="text-foreground">{formatCurrency(total)}</strong> com{' '}
                    {cart.length} item(s)?
                  </p>
                </div>
              </div>

              {outOfStockItems.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Estoque insuficiente</span>
                  </div>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 pl-6 list-disc">
                    {outOfStockItems.map(item => (
                      <li key={item.productId + item.unitId}>{item.productName}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600 dark:text-amber-500 pl-6">
                    O estoque ficará negativo. A venda será registrada mesmo assim.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setFinalizeConfirm(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setFinalizeConfirm(false)
                    finalizeFormRef.current?.requestSubmit()
                  }}
                  loading={isPending || completing}
                >
                  <Check className="h-4 w-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
