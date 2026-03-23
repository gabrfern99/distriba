'use client'

import { useEffect, useState } from 'react'
import {
  addInventoryItem,
  completeInventory,
  deleteInventoryItem,
  searchInventoryProducts,
  updateInventoryItem,
} from '@/features/estoque/actions'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { formatDateTime, formatDecimal } from '@/lib/utils'
import { Search } from 'lucide-react'

type DifferenceFilter = 'all' | 'changed' | 'same' | 'positive' | 'negative'

interface InventoryDetailItem {
  id: string
  productId: string
  productName: string
  productSku: string
  baseUnitLabel: string
  systemStock: number
  countedStock: number
  difference: number
  justification: string
}

interface InventoryDetail {
  id: string
  code: string
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  userName: string
  createdAt: string
  completedAt: string | null
  items: InventoryDetailItem[]
}

interface InventoryProductOption {
  id: string
  name: string
  sku: string
  baseUnitLabel: string
  currentStock: number
  isActive: boolean
}

function getDifferenceMeta(difference: number) {
  if (difference > 0) {
    return { label: 'Aumentar estoque', variant: 'success' as const, textClass: 'text-green-600' }
  }

  if (difference < 0) {
    return { label: 'Reduzir estoque', variant: 'destructive' as const, textClass: 'text-destructive' }
  }

  return { label: 'Sem divergência', variant: 'outline' as const, textClass: 'text-muted-foreground' }
}

export function InventoryDetailClient({ initialInventory }: { initialInventory: InventoryDetail }) {
  const { toast } = useToast()
  const [inventory, setInventory] = useState(initialInventory)
  const [search, setSearch] = useState('')
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftCountedStock, setDraftCountedStock] = useState('')
  const [draftJustification, setDraftJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InventoryDetailItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState<InventoryProductOption[]>([])
  const [selectedProduct, setSelectedProduct] = useState<InventoryProductOption | null>(null)
  const [addCountedStock, setAddCountedStock] = useState('')
  const [addJustification, setAddJustification] = useState('Contagem inicial')
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [adding, setAdding] = useState(false)

  const sortedItems = [...inventory.items].sort((a, b) =>
    a.productName.localeCompare(b.productName, 'pt-BR'),
  )

  const filteredItems = sortedItems.filter((item) => {
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch =
      normalizedSearch.length === 0 ||
      item.productName.toLowerCase().includes(normalizedSearch) ||
      item.productSku.toLowerCase().includes(normalizedSearch)

    const matchesDifference =
      differenceFilter === 'all' ||
      (differenceFilter === 'changed' && item.difference !== 0) ||
      (differenceFilter === 'same' && item.difference === 0) ||
      (differenceFilter === 'positive' && item.difference > 0) ||
      (differenceFilter === 'negative' && item.difference < 0)

    return matchesSearch && matchesDifference
  })

  const differenceCount = inventory.items.filter((item) => item.difference !== 0).length
  const positiveCount = inventory.items.filter((item) => item.difference > 0).length
  const negativeCount = inventory.items.filter((item) => item.difference < 0).length
  const shouldSearchProducts =
    inventory.status === 'OPEN' && !selectedProduct && addSearch.trim().length >= 2

  useEffect(() => {
    if (!shouldSearchProducts) {
      return
    }

    let cancelled = false

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await searchInventoryProducts(addSearch.trim())
        if (cancelled) return

        const existingProductIds = new Set(inventory.items.map((item) => item.productId))
        setAddResults(result.products.filter((product) => !existingProductIds.has(product.id)))
      } finally {
        if (!cancelled) setSearchingProducts(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [addSearch, inventory.items, shouldSearchProducts])

  function startEdit(item: InventoryDetailItem) {
    setEditingId(item.id)
    setDraftCountedStock(String(item.countedStock))
    setDraftJustification(item.justification)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftCountedStock('')
    setDraftJustification('')
  }

  function resetAddItemForm() {
    setAddSearch('')
    setAddResults([])
    setSelectedProduct(null)
    setAddCountedStock('')
    setAddJustification('Contagem inicial')
  }

  function handleSelectProduct(product: InventoryProductOption) {
    setSelectedProduct(product)
    setAddSearch(product.name)
    setAddCountedStock(String(product.currentStock))
    setAddJustification('Contagem inicial')
    setAddResults([])
    setSearchingProducts(false)
  }

  async function handleSaveEdit() {
    if (!editingId) return

    const countedStock = Number.parseFloat(draftCountedStock.replace(',', '.'))
    if (!Number.isFinite(countedStock) || countedStock < 0) {
      toast('Informe uma quantidade contada válida', 'error')
      return
    }

    setSaving(true)
    const result = await updateInventoryItem(editingId, {
      countedStock,
      justification: draftJustification,
    })
    setSaving(false)

    if (result.error) {
      toast(result.error, 'error')
      return
    }

    if (result.item) {
      setInventory((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === result.item.id ? result.item : item)),
      }))
    }

    toast('Item do inventário atualizado')
    cancelEdit()
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    const result = await deleteInventoryItem(deleteTarget.id)
    setDeleting(false)

    if (result.error) {
      toast(result.error, 'error')
      return
    }

    setInventory((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== deleteTarget.id),
    }))
    if (editingId === deleteTarget.id) cancelEdit()
    toast('Item removido do inventário')
    setDeleteTarget(null)
  }

  async function handleAddItem() {
    if (!selectedProduct) {
      toast('Selecione um produto para adicionar', 'error')
      return
    }

    const countedStock = Number.parseFloat(addCountedStock.replace(',', '.'))
    if (!Number.isFinite(countedStock) || countedStock < 0) {
      toast('Informe uma quantidade contada válida', 'error')
      return
    }

    setAdding(true)
    const result = await addInventoryItem(inventory.id, {
      productId: selectedProduct.id,
      countedStock,
      justification: addJustification,
    })
    setAdding(false)

    if (result.error) {
      toast(result.error, 'error')
      return
    }

    if (result.item) {
      setInventory((current) => ({
        ...current,
        items: [...current.items, result.item],
      }))
    }

    toast('Item adicionado ao inventário')
    resetAddItemForm()
  }

  async function handleComplete() {
    setCompleting(true)
    const result = await completeInventory(inventory.id)
    setCompleting(false)

    if (result.error) {
      toast(result.error, 'error')
      return
    }

    setInventory((current) => ({
      ...current,
      status: 'COMPLETED',
      completedAt: result.completedAt ?? new Date().toISOString(),
    }))
    setConfirmCompleteOpen(false)
    cancelEdit()
    resetAddItemForm()
    toast('Inventário concluído. Estoque atualizado.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/10 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Inventário {inventory.code}</h1>
            <InventoryStatusBadge status={inventory.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Criado por {inventory.userName} em {formatDateTime(inventory.createdAt)}
          </p>
          {inventory.completedAt && (
            <p className="text-sm text-muted-foreground">
              Concluído em {formatDateTime(inventory.completedAt)}
            </p>
          )}
          {inventory.notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inventory.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {inventory.status === 'OPEN' ? (
            <Button onClick={() => setConfirmCompleteOpen(true)}>
              Concluir inventário
            </Button>
          ) : (
            <Badge variant="success" className="px-3 py-1.5">
              Estoque já conciliado
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Itens</div>
          <div className="mt-1 text-2xl font-bold">{inventory.items.length}</div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Com divergência</div>
          <div className="mt-1 text-2xl font-bold">{differenceCount}</div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Aumentar estoque</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{positiveCount}</div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Reduzir estoque</div>
          <div className="mt-1 text-2xl font-bold text-destructive">{negativeCount}</div>
        </div>
      </div>

      {inventory.status === 'OPEN' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ao concluir, o estoque atual dos produtos será substituído pelas quantidades contadas neste inventário.
        </div>
      )}

      {inventory.status === 'OPEN' && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-base font-semibold">Adicionar item</h2>
            <p className="text-sm text-muted-foreground">
              Inclua novos produtos diretamente neste inventário antes de concluir a contagem.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_180px_minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Produto</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={addSearch}
                  onChange={(e) => {
                    const value = e.target.value
                    setAddSearch(value)
                    setSelectedProduct(null)
                    if (value.trim().length >= 2) {
                      setSearchingProducts(true)
                    } else {
                      setSearchingProducts(false)
                      setAddResults([])
                    }
                  }}
                  placeholder="Buscar produto por nome ou SKU..."
                  className="flex h-9 w-full rounded-md border border-border bg-background py-1 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {selectedProduct && (
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {selectedProduct.sku} · Estoque atual {formatDecimal(selectedProduct.currentStock, 2)} ({selectedProduct.baseUnitLabel})
                  {!selectedProduct.isActive && (
                    <span className="ml-2 font-medium text-amber-700">Produto inativo</span>
                  )}
                </div>
              )}
              {!selectedProduct && addSearch.trim().length >= 2 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border shadow-sm">
                  {addResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.sku} · Estoque: {formatDecimal(product.currentStock, 2)} ({product.baseUnitLabel})
                        {!product.isActive && ' · Inativo'}
                      </div>
                    </button>
                  ))}
                  {!searchingProducts && addResults.length === 0 && (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">
                      Nenhum produto disponível para adicionar.
                    </div>
                  )}
                  {searchingProducts && (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">
                      Buscando produtos...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Qtd. contada</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={addCountedStock}
                onChange={(e) => setAddCountedStock(e.target.value)}
                placeholder="0"
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Justificativa</label>
              <input
                value={addJustification}
                onChange={(e) => setAddJustification(e.target.value)}
                placeholder="Motivo da contagem..."
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-2 lg:pt-7">
              <Button onClick={handleAddItem} loading={adding}>
                Adicionar
              </Button>
              <Button type="button" variant="outline" onClick={resetAddItemForm} disabled={adding}>
                Limpar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome do produto ou SKU..."
            className="flex h-9 w-full rounded-md border border-border bg-background py-1 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="w-full lg:w-64">
          <Select
            value={differenceFilter}
            onChange={(e) => setDifferenceFilter(e.target.value as DifferenceFilter)}
          >
            <option value="all">Todos os itens</option>
            <option value="changed">Com divergência</option>
            <option value="same">Sem divergência</option>
            <option value="positive">Aumentar estoque</option>
            <option value="negative">Reduzir estoque</option>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Produto</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Sistema</th>
              <th className="px-4 py-3 text-right font-medium">Contado</th>
              <th className="px-4 py-3 text-right font-medium">Diferença</th>
              <th className="px-4 py-3 text-left font-medium">Justificativa</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum item encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isEditing = editingId === item.id
                const parsedDraftCountedStock = Number.parseFloat(draftCountedStock.replace(',', '.'))
                const previewDifference =
                  isEditing && Number.isFinite(parsedDraftCountedStock)
                    ? parsedDraftCountedStock - item.systemStock
                    : item.difference
                const differenceMeta = getDifferenceMeta(previewDifference)

                return (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.productSku} · Base: {item.baseUnitLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={differenceMeta.variant}>{differenceMeta.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatDecimal(item.systemStock, 2)} ({item.baseUnitLabel})
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={draftCountedStock}
                          onChange={(e) => setDraftCountedStock(e.target.value)}
                          className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      ) : (
                        <span className="font-medium">
                          {formatDecimal(item.countedStock, 2)} ({item.baseUnitLabel})
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${differenceMeta.textClass}`}>
                      {previewDifference > 0 ? '+' : ''}
                      {formatDecimal(previewDifference, 2)} ({item.baseUnitLabel})
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={draftJustification}
                          onChange={(e) => setDraftJustification(e.target.value)}
                          placeholder="Motivo da divergência..."
                          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {item.justification}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {inventory.status === 'OPEN' ? (
                          isEditing ? (
                            <>
                              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={handleSaveEdit} loading={saving}>
                                Salvar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget(item)}
                              >
                                Excluir
                              </Button>
                            </>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">Somente leitura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir item do inventário"
        description={
          deleteTarget
            ? `Deseja remover "${deleteTarget.productName}" deste inventário?`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={confirmCompleteOpen}
        title="Concluir inventário"
        description="Ao confirmar, o estoque atual dos produtos será substituído pelas quantidades contadas neste inventário."
        onConfirm={handleComplete}
        onCancel={() => setConfirmCompleteOpen(false)}
        confirmLabel="Concluir inventário"
        confirmVariant="default"
        loading={completing}
      />
    </div>
  )
}
