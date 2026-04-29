'use client'

import { useEffect, useState } from 'react'
import {
  addPurchaseOrderItem,
  completePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrderItem,
  searchPurchaseProducts,
  sendPurchaseOrder,
  updatePurchaseOrderItem,
} from '@/features/compras/actions'
import { PurchaseOrderStatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { ClientPagination } from '@/components/shared/pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Search } from 'lucide-react'

const ITEMS_PER_PAGE = 10

interface OrderDetailItem {
  id: string
  productId: string
  productName: string
  unitName: string
  unitPrice: number
  quantity: number
  conversionFactor: number
  baseQuantity: number
  subtotal: number
}

interface OrderDetail {
  id: string
  code: string
  status: 'DRAFT' | 'SENT' | 'COMPLETED' | 'CANCELLED'
  supplierName: string | null
  totalAmount: number
  notes: string | null
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  items: OrderDetailItem[]
}

interface ProductUnit {
  unitName: string
  abbreviation: string
  conversionFactor: number
}

interface ProductOption {
  id: string
  name: string
  sku: string
  baseUnitName: string
  productUnits: ProductUnit[]
}

export function PurchaseOrderDetailClient({ initialOrder }: { initialOrder: OrderDetail }) {
  const { toast } = useToast()
  const [order, setOrder] = useState(initialOrder)
  const [search, setSearch] = useState('')
  const [itemsPage, setItemsPage] = useState(1)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftQuantity, setDraftQuantity] = useState('')
  const [draftUnitPrice, setDraftUnitPrice] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<OrderDetailItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Dialog state
  const [dialog, setDialog] = useState<'send' | 'complete' | 'cancel' | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)

  // Add item state
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState<ProductOption[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [addQuantity, setAddQuantity] = useState('1')
  const [addUnitPrice, setAddUnitPrice] = useState('0')
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [adding, setAdding] = useState(false)

  const isEditable = order.status === 'DRAFT' || order.status === 'SENT'

  const sortedItems = [...order.items].sort((a, b) =>
    a.productName.localeCompare(b.productName, 'pt-BR'),
  )

  const filteredItems = sortedItems.filter((item) => {
    const normalizedSearch = search.trim().toLowerCase()
    return (
      normalizedSearch.length === 0 ||
      item.productName.toLowerCase().includes(normalizedSearch)
    )
  })

  const totalAmount = order.items.reduce((sum, i) => sum + i.subtotal, 0)
  const totalItemPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = filteredItems.slice(
    (itemsPage - 1) * ITEMS_PER_PAGE,
    itemsPage * ITEMS_PER_PAGE,
  )

  const shouldSearchProducts =
    isEditable && !selectedProduct && addSearch.trim().length >= 1

  useEffect(() => {
    if (!shouldSearchProducts) return

    let cancelled = false

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await searchPurchaseProducts(addSearch.trim())
        if (cancelled) return
        setAddResults(result.products)
      } finally {
        if (!cancelled) setSearchingProducts(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [addSearch, shouldSearchProducts])

  function startEdit(item: OrderDetailItem) {
    setEditingId(item.id)
    setDraftQuantity(String(item.quantity))
    setDraftUnitPrice(String(item.unitPrice))
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftQuantity('')
    setDraftUnitPrice('')
  }

  function resetAddItemForm() {
    setAddSearch('')
    setAddResults([])
    setSelectedProduct(null)
    setSelectedUnit(null)
    setAddQuantity('1')
    setAddUnitPrice('0')
  }

  function handleSelectProduct(product: ProductOption) {
    setSelectedProduct(product)
    setAddSearch(product.name)
    setAddResults([])
    setSearchingProducts(false)
    if (product.productUnits.length > 0) {
      setSelectedUnit(product.productUnits[0])
    } else {
      setSelectedUnit(null)
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return

    const qty = parseFloat(draftQuantity)
    const price = parseFloat(draftUnitPrice)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast('Quantidade inválida', 'error')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast('Preço inválido', 'error')
      return
    }

    const currentItem = order.items.find((i) => i.id === editingId)
    if (!currentItem) return

    setSaving(true)
    const result = await updatePurchaseOrderItem(editingId, {
      quantity: qty,
      unitPrice: price,
      unitName: currentItem.unitName,
      conversionFactor: currentItem.conversionFactor,
    })
    setSaving(false)

    if ('error' in result && result.error) {
      toast(result.error, 'error')
      return
    }

    if (result.item) {
      setOrder((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === result.item!.id ? result.item! : item,
        ),
        totalAmount: current.items.reduce(
          (sum, item) => sum + (item.id === result.item!.id ? result.item!.subtotal : item.subtotal),
          0,
        ),
      }))
    }

    toast('Item atualizado')
    cancelEdit()
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    const result = await deletePurchaseOrderItem(deleteTarget.id)
    setDeleting(false)

    if ('error' in result && result.error) {
      toast(result.error, 'error')
      return
    }

    setOrder((current) => {
      const newItems = current.items.filter((item) => item.id !== deleteTarget.id)
      return {
        ...current,
        items: newItems,
        totalAmount: newItems.reduce((sum, i) => sum + i.subtotal, 0),
      }
    })
    if (editingId === deleteTarget.id) cancelEdit()
    toast('Item removido do pedido')
    setDeleteTarget(null)
  }

  async function handleAddItem() {
    if (!selectedProduct) {
      toast('Selecione um produto', 'error')
      return
    }

    const qty = parseFloat(addQuantity)
    const price = parseFloat(addUnitPrice)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast('Quantidade inválida', 'error')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast('Preço inválido', 'error')
      return
    }

    const unitName = selectedUnit?.unitName ?? selectedProduct.baseUnitName
    const conversionFactor = selectedUnit?.conversionFactor ?? 1

    setAdding(true)
    const result = await addPurchaseOrderItem(order.id, {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      unitName,
      conversionFactor,
      quantity: qty,
      unitPrice: price,
    })
    setAdding(false)

    if ('error' in result && result.error) {
      toast(result.error, 'error')
      return
    }

    if (result.item) {
      setOrder((current) => {
        const newItems = [...current.items, result.item!]
        return {
          ...current,
          items: newItems,
          totalAmount: newItems.reduce((sum, i) => sum + i.subtotal, 0),
        }
      })
    }

    toast('Item adicionado ao pedido')
    resetAddItemForm()
  }

  async function handleAction(action: 'send' | 'complete' | 'cancel') {
    setDialogLoading(true)
    let result
    if (action === 'send') result = await sendPurchaseOrder(order.id)
    else if (action === 'complete') result = await completePurchaseOrder(order.id)
    else result = await cancelPurchaseOrder(order.id)
    setDialogLoading(false)
    setDialog(null)

    if ('error' in result && typeof result.error === 'string') {
      toast(result.error, 'error')
      return
    }

    if (action === 'send') {
      setOrder((c) => ({ ...c, status: 'SENT', sentAt: new Date().toISOString() }))
      toast('Pedido marcado como enviado!')
    } else if (action === 'complete') {
      setOrder((c) => ({ ...c, status: 'COMPLETED', completedAt: new Date().toISOString() }))
      cancelEdit()
      resetAddItemForm()
      toast('Pedido concluído! Estoque atualizado.')
    } else {
      setOrder((c) => ({ ...c, status: 'CANCELLED' }))
      cancelEdit()
      resetAddItemForm()
      toast('Pedido cancelado')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/10 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Pedido {order.code}</h1>
            <PurchaseOrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {order.supplierName ? `Fornecedor: ${order.supplierName} · ` : ''}Criado em {formatDateTime(order.createdAt)}
          </p>
          {order.sentAt && (
            <p className="text-sm text-muted-foreground">
              Enviado em {formatDateTime(order.sentAt)}
            </p>
          )}
          {order.completedAt && (
            <p className="text-sm text-muted-foreground">
              Concluído em {formatDateTime(order.completedAt)}
            </p>
          )}
          {order.notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === 'DRAFT' && (
            <>
              <Button variant="outline" onClick={() => setDialog('send')}>Marcar enviado</Button>
              <Button onClick={() => setDialog('complete')}>Concluir compra</Button>
              <Button variant="destructive" onClick={() => setDialog('cancel')}>Cancelar</Button>
            </>
          )}
          {order.status === 'SENT' && (
            <>
              <Button onClick={() => setDialog('complete')}>Concluir compra</Button>
              <Button variant="destructive" onClick={() => setDialog('cancel')}>Cancelar</Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Itens</div>
          <div className="mt-1 text-2xl font-bold">{order.items.length}</div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Total do pedido</div>
          <div className="mt-1 text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-1">
            <PurchaseOrderStatusBadge status={order.status} />
          </div>
        </div>
      </div>

      {/* Warning for editable orders */}
      {isEditable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ao concluir, o estoque dos produtos será atualizado com as quantidades deste pedido.
        </div>
      )}

      {/* Add item form */}
      {isEditable && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-base font-semibold">Adicionar item</h2>
            <p className="text-sm text-muted-foreground">
              Inclua novos produtos diretamente neste pedido antes de concluir.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_180px_180px_180px_auto] lg:items-start">
            {/* Product search */}
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
                    setSelectedUnit(null)
                    if (value.trim().length >= 1) {
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
              {selectedProduct && selectedProduct.productUnits.length > 0 && (
                <Select
                  value={selectedUnit?.abbreviation ?? ''}
                  onChange={(e) => {
                    const pu = selectedProduct.productUnits.find(
                      (u) => u.abbreviation === e.target.value,
                    )
                    if (pu) setSelectedUnit(pu)
                  }}
                >
                  {selectedProduct.productUnits.map((pu) => (
                    <option key={pu.abbreviation} value={pu.abbreviation}>
                      {pu.unitName} (1 {pu.abbreviation} = {pu.conversionFactor} {selectedProduct.baseUnitName})
                    </option>
                  ))}
                </Select>
              )}
              {!selectedProduct && addSearch.trim().length >= 1 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border shadow-sm">
                  {addResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                    </button>
                  ))}
                  {!searchingProducts && addResults.length === 0 && (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">
                      Nenhum produto encontrado.
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

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantidade</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Unit price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preço unit. (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addUnitPrice}
                onChange={(e) => setAddUnitPrice(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Preview subtotal */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subtotal</label>
              <div className="flex h-9 items-center text-sm font-medium text-muted-foreground">
                {formatCurrency(
                  Math.round((parseFloat(addQuantity) || 0) * (parseFloat(addUnitPrice) || 0) * 100) / 100,
                )}
              </div>
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

      {/* Search/filter */}
      {order.items.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setItemsPage(1) }}
              placeholder="Filtrar por nome do produto..."
              className="flex h-9 w-full rounded-md border border-border bg-background py-1 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Produto</th>
              <th className="px-4 py-3 text-left font-medium">Unidade</th>
              <th className="px-4 py-3 text-right font-medium">Qtd</th>
              <th className="px-4 py-3 text-right font-medium">Preço unit.</th>
              <th className="px-4 py-3 text-right font-medium">Subtotal</th>
              {isEditable && <th className="px-4 py-3 text-right font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={isEditable ? 6 : 5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {order.items.length === 0
                    ? 'Nenhum item neste pedido.'
                    : 'Nenhum item encontrado com o filtro atual.'}
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const isEditing = editingId === item.id
                const previewQty = isEditing ? parseFloat(draftQuantity) || 0 : item.quantity
                const previewPrice = isEditing ? parseFloat(draftUnitPrice) || 0 : item.unitPrice
                const previewSubtotal = Math.round(previewQty * previewPrice * 100) / 100

                return (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.productName}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unitName}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={draftQuantity}
                          onChange={(e) => setDraftQuantity(e.target.value)}
                          className="h-8 w-24 rounded-md border border-border bg-background px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draftUnitPrice}
                          onChange={(e) => setDraftUnitPrice(e.target.value)}
                          className="h-8 w-28 rounded-md border border-border bg-background px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      ) : (
                        formatCurrency(item.unitPrice)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {isEditing ? formatCurrency(previewSubtotal) : formatCurrency(item.subtotal)}
                    </td>
                    {isEditable && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
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
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
            {paginatedItems.length > 0 && (
              <tr className="border-t-2 border-border font-bold">
                <td colSpan={isEditable ? 4 : 4} className="px-4 py-3 text-right">Total</td>
                <td className="px-4 py-3 text-right text-primary">{formatCurrency(totalAmount)}</td>
                {isEditable && <td />}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ClientPagination
        currentPage={itemsPage}
        totalPages={totalItemPages}
        onPageChange={setItemsPage}
      />

      {/* Dialogs */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir item do pedido"
        description={
          deleteTarget
            ? `Deseja remover "${deleteTarget.productName}" deste pedido?`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={dialog === 'send'}
        title="Marcar como enviado"
        description="Confirmar que o pedido foi enviado ao fornecedor?"
        onConfirm={() => handleAction('send')}
        onCancel={() => setDialog(null)}
        confirmLabel="Confirmar"
        confirmVariant="default"
        loading={dialogLoading}
      />

      <ConfirmDialog
        open={dialog === 'complete'}
        title="Concluir compra"
        description="Ao confirmar, o estoque dos produtos será atualizado com as quantidades do pedido."
        onConfirm={() => handleAction('complete')}
        onCancel={() => setDialog(null)}
        confirmLabel="Concluir compra"
        confirmVariant="default"
        loading={dialogLoading}
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Cancelar pedido"
        description="Deseja cancelar este pedido de compra?"
        onConfirm={() => handleAction('cancel')}
        onCancel={() => setDialog(null)}
        loading={dialogLoading}
      />
    </div>
  )
}
