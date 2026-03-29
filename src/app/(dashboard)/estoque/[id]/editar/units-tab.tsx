'use client'

import { useActionState, useEffect, useState } from 'react'
import { addProductUnit, removeProductUnit, setBaseUnit, updateMinStock } from '@/features/estoque/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { formatCurrency } from '@/lib/utils'
import { Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UnitOfMeasure } from '@prisma/client'

interface ProductUnit {
  id: string
  unitOfMeasureId: string
  conversionFactor: number
  salePrice: number
  unitOfMeasure: { id: string; name: string; abbreviation: string }
}

interface UnitsTabProps {
  product: {
    id: string
    minStock: number
    baseUnitId: string | null
    productUnits: ProductUnit[]
  }
  units: UnitOfMeasure[]
}

export function UnitsTab({ product, units }: UnitsTabProps) {
  const { toast } = useToast()
  const router = useRouter()

  // Add unit form
  const addAction = addProductUnit.bind(null, product.id)
  const [addState, addFormAction, addPending] = useActionState(addAction, null)

  // Base unit select
  const [settingBase, setSettingBase] = useState(false)

  // Min stock
  const [minStockValue, setMinStockValue] = useState(
    product.minStock > 0 ? String(product.minStock) : '',
  )
  const [savingMinStock, setSavingMinStock] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (addState?.success) {
      toast('Unidade adicionada!')
      router.refresh()
    }
    if (addState?.error) {
      toast(addState.error, 'error')
    }
  }, [addState])

  async function handleSetBaseUnit(baseUnitId: string) {
    setSettingBase(true)
    const result = await setBaseUnit(product.id, baseUnitId)
    setSettingBase(false)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Unidade base atualizada!')
      router.refresh()
    }
  }

  async function handleSaveMinStock() {
    setSavingMinStock(true)
    const value = parseFloat(minStockValue) || 0
    const result = await updateMinStock(product.id, value)
    setSavingMinStock(false)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Estoque mínimo atualizado!')
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await removeProductUnit(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Unidade removida!')
      router.refresh()
    }
  }

  const usedUnitIds = product.productUnits.map((pu) => pu.unitOfMeasureId)
  const availableUnits = units.filter((u) => !usedUnitIds.includes(u.id))

  return (
    <div className="space-y-6">
      {/* Base unit select + min stock */}
      {product.productUnits.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-foreground">Unidade base</label>
              <div className="flex gap-2 items-center">
                <select
                  value={product.baseUnitId ?? ''}
                  onChange={(e) => {
                    if (e.target.value) handleSetBaseUnit(e.target.value)
                  }}
                  disabled={settingBase}
                  className="flex h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Selecione a unidade base...</option>
                  {product.productUnits.map((pu) => (
                    <option key={pu.id} value={pu.id}>
                      {pu.unitOfMeasure.name} ({pu.unitOfMeasure.abbreviation})
                    </option>
                  ))}
                </select>
                {settingBase && (
                  <span className="text-xs text-muted-foreground">Salvando...</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-48">
              <label className="text-sm font-medium text-foreground">
                Estoque mínimo
                {product.baseUnitId && (() => {
                  const base = product.productUnits.find((pu) => pu.id === product.baseUnitId)
                  return base ? ` (${base.unitOfMeasure.abbreviation})` : ''
                })()}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minStockValue}
                  onChange={(e) => setMinStockValue(e.target.value)}
                  placeholder="0"
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveMinStock}
                  loading={savingMinStock}
                  className="shrink-0 h-9"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A unidade base é usada como referência para estoque mínimo e conversões.
          </p>
        </div>
      )}

      {/* Existing units list */}
      {product.productUnits.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Unidade</th>
                <th className="text-right px-4 py-3 font-medium">Fator de conversão</th>
                <th className="text-right px-4 py-3 font-medium">Preço de venda</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {product.productUnits.map((pu) => (
                <tr key={pu.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {pu.unitOfMeasure.name}
                      <span className="text-muted-foreground ml-1">({pu.unitOfMeasure.abbreviation})</span>
                    </div>
                    {pu.id === product.baseUnitId && (
                      <span className="text-xs text-primary font-medium">Unidade base</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{pu.conversionFactor}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(pu.salePrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: pu.id, name: pu.unitOfMeasure.name })}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover unidade"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Nenhuma unidade cadastrada para este produto.
        </p>
      )}

      {/* Add unit form */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Adicionar unidade
        </h3>
        {availableUnits.length === 0 && units.length > 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Todas as unidades disponíveis já foram vinculadas.
          </p>
        ) : units.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhuma unidade cadastrada.{' '}
            <a href="/estoque/unidades" className="text-primary hover:underline">
              Cadastre unidades
            </a>{' '}
            para vincular a este produto.
          </p>
        ) : (
          <form action={addFormAction} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Unidade</label>
              <select
                name="unitOfMeasureId"
                required
                className="h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione...</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <Input
                id="conversionFactor"
                name="conversionFactor"
                type="number"
                step="0.0001"
                min="0.0001"
                label="Fator de conversão"
                placeholder="ex: 6"
                required
              />
            </div>
            <div className="w-36">
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                min="0"
                label="Preço de venda (R$)"
                placeholder="0,00"
              />
            </div>
            <Button type="submit" loading={addPending} className="shrink-0">
              Adicionar
            </Button>
          </form>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remover unidade"
        description={`Deseja remover a unidade "${deleteTarget?.name}" deste produto? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Remover"
        loading={deleting}
      />
    </div>
  )
}
