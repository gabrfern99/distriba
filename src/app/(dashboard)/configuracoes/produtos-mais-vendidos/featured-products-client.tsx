'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
import {
  addFeaturedProduct,
  removeFeaturedProduct,
  reorderFeaturedProducts,
  searchProductsForFeatured,
  toggleShowInPdv,
} from '@/features/configuracoes/featured-products-actions'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Search, X, GripVertical, Trash2, Trophy, Medal, Star, Package } from 'lucide-react'

interface FeaturedItem {
  id: string
  position: number
  showInPdv: boolean
  product: {
    id: string
    name: string
    sku: string
    salePrice: number
    currentStock: number
    isActive: boolean
  }
}

interface SearchResult {
  id: string
  name: string
  sku: string
  salePrice: number
  currentStock: number
}

const MAX_FEATURED = 20

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 1)
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 shrink-0">
        <Trophy className="h-4 w-4 text-yellow-500" />
      </div>
    )
  if (pos === 2)
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/30 shrink-0">
        <Medal className="h-4 w-4 text-slate-400" />
      </div>
    )
  if (pos === 3)
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-400/20 shrink-0">
        <Star className="h-4 w-4 text-orange-500" />
      </div>
    )
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
      <span className="text-xs font-bold text-muted-foreground">{pos}</span>
    </div>
  )
}

export function FeaturedProductsClient({
  initialFeatured,
}: {
  initialFeatured: FeaturedItem[]
}) {
  const [featured, setFeatured] = useState<FeaturedItem[]>(initialFeatured)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, startSearchTransition] = useTransition()
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const featuredIds = new Set(featured.map((f) => f.product.id))

  function handleSearchChange(val: string) {
    setSearch(val)
    setError(null)
    if (!val.trim()) {
      setResults([])
      setShowSuggestions(false)
      return
    }
    startSearchTransition(async () => {
      const res = await searchProductsForFeatured(val)
      setResults(
        res.map((r) => ({
          ...r,
          salePrice: Number(r.salePrice),
          currentStock: Number(r.currentStock),
        })),
      )
      setShowSuggestions(true)
    })
  }

  function handleAdd(product: SearchResult) {
    if (featured.length >= MAX_FEATURED) {
      setError(`Limite de ${MAX_FEATURED} produtos atingido`)
      return
    }
    if (featuredIds.has(product.id)) {
      setError('Produto já está na lista')
      return
    }
    setSearch('')
    setResults([])
    setShowSuggestions(false)

    const optimistic: FeaturedItem = {
      id: `temp-${Date.now()}`,
      position: featured.length + 1,
      showInPdv: true,
      product: { ...product, isActive: true },
    }
    setFeatured((prev) => [...prev, optimistic])

    startTransition(async () => {
      const res = await addFeaturedProduct(product.id)
      if (res?.error) {
        setError(res.error)
        setFeatured((prev) => prev.filter((f) => f.id !== optimistic.id))
      }
    })
  }

  function handleRemove(id: string) {
    setFeatured((prev) =>
      prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, position: i + 1 })),
    )
    startTransition(async () => {
      await removeFeaturedProduct(id)
    })
  }

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverId(id)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      setDragOverId(null)
      const fromId = dragId.current
      dragId.current = null
      if (!fromId || fromId === targetId) return

      const items = [...featured]
      const fromIdx = items.findIndex((f) => f.id === fromId)
      const toIdx = items.findIndex((f) => f.id === targetId)
      if (fromIdx < 0 || toIdx < 0) return
      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)
      const reordered = items.map((f, idx) => ({ ...f, position: idx + 1 }))

      setFeatured(reordered)

      startTransition(async () => {
        await reorderFeaturedProducts(reordered.map((f) => f.id))
        toast('Ordenação atualizada')
      })
    },
    [featured, startTransition, toast],
  )

  const handleDragEnd = useCallback(() => {
    dragId.current = null
    setDragOverId(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Adicionar produto</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {featured.length}/{MAX_FEATURED} produtos
          </span>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => search && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Buscar por nome ou SKU..."
              disabled={featured.length >= MAX_FEATURED}
              className="flex h-10 w-full max-w-md rounded-md border border-border bg-background pl-9 pr-9 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setResults([])
                  setShowSuggestions(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {showSuggestions && (
            <div className="absolute z-20 mt-1 w-full max-w-md rounded-md border border-border bg-background shadow-lg overflow-hidden">
              {isSearching ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                results.map((p) => {
                  const inList = featuredIds.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => !inList && handleAdd(p)}
                      disabled={inList}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-primary">
                          {formatCurrency(p.salePrice)}
                        </div>
                        {inList && (
                          <span className="text-[10px] text-muted-foreground">Já na lista</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Lista de destaque</h2>
          {featured.length === 0 && (
            <span className="text-xs text-muted-foreground ml-1">— vazia</span>
          )}
        </div>

        {featured.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum produto na lista</p>
            <p className="text-xs opacity-70">Use a busca acima para adicionar produtos</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="w-10 px-3 py-2.5" />
                    <th className="w-12 px-2 py-2.5 text-center text-xs font-medium text-muted-foreground">
                      Pos.
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Produto
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                      SKU
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">
                      Preço
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                      PDV
                    </th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {featured.map((item) => (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDrop={(e) => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`border-b border-border last:border-0 transition-colors ${
                        dragOverId === item.id
                          ? 'bg-primary/5 border-t-2 border-t-primary'
                          : 'hover:bg-muted/20'
                      } ${dragId.current === item.id ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing mx-auto" />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <PositionBadge pos={item.position} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium leading-tight">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{item.product.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                        {item.product.sku}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-primary">
                          {formatCurrency(item.product.salePrice)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.showInPdv}
                          onChange={(e) => {
                            const next = e.target.checked
                            setFeatured((prev) =>
                              prev.map((f) => f.id === item.id ? { ...f, showInPdv: next } : f),
                            )
                            startTransition(async () => {
                              await toggleShowInPdv(item.id, next)
                            })
                          }}
                          className="h-4 w-4 cursor-pointer accent-primary"
                          title={item.showInPdv ? 'Visível no PDV' : 'Oculto no PDV'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={isPending}
                          className="text-muted-foreground hover:text-destructive transition-colors rounded-sm p-0.5 disabled:opacity-50"
                          title="Remover da lista"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 bg-muted/10 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
              <GripVertical className="h-3.5 w-3.5" />
              Arraste as linhas para reordenar
            </div>
          </>
        )}
      </div>
    </div>
  )
}
