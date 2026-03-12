'use client'

import { useActionState, useState, useEffect } from 'react'
import { createMovement } from '@/features/estoque/actions'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDecimal } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  currentStock: number | { toString(): string }
}

export function NewMovementForm({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const { toast } = useToast()

  const [state, formAction, isPending] = useActionState(createMovement, null)

  useEffect(() => {
    if (state?.success) {
      toast('Movimentação registrada!')
      setOpen(false)
      setProductId('')
    }
    if (state?.error) {
      toast(state.error, 'error')
    }
  }, [state])

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: `${p.sku} — Estoque: ${formatDecimal(Number(p.currentStock), 2)}`,
  }))

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova movimentação
      </Button>

      <Dialog open={open} onClose={() => { setOpen(false); setProductId('') }} title="Registrar movimentação" className="max-w-md">
        <form action={formAction} className="space-y-4">
          <Combobox
            label="Produto *"
            name="productId"
            value={productId}
            onChange={setProductId}
            options={productOptions}
            placeholder="Selecione um produto"
            searchPlaceholder="Pesquisar por nome ou SKU..."
          />

          <Select id="type" name="type" label="Tipo *" required>
            <option value="">Selecione o tipo</option>
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Saída</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </Select>

          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="0.001"
            min="0.001"
            label="Quantidade *"
            required
          />

          <Textarea
            id="notes"
            name="notes"
            label="Observação"
            placeholder="Motivo da movimentação..."
          />

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setProductId('') }}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              Registrar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
