'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateProductGeneral } from '@/features/estoque/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { BarcodeScanner } from '@/components/shared/barcode-scanner'
import { useHardwareScanner } from '@/hooks/use-hardware-scanner'

interface GeneralDataFormProps {
  product: {
    id: string
    name: string
    sku: string
    description: string | null
    minStock: number
  }
  baseUnitLabel: string | null
}

export function GeneralDataForm({ product, baseUnitLabel }: GeneralDataFormProps) {
  const { toast } = useToast()
  const action = updateProductGeneral.bind(null, product.id)
  const [state, formAction, isPending] = useActionState(action, null)
  const [sku, setSku] = useState(product.sku)

  useHardwareScanner((code) => setSku(code))

  useEffect(() => {
    if (state?.success) {
      toast('Dados atualizados!')
    }
    if (state?.error) {
      toast(state.error, 'error')
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            id="name"
            name="name"
            label="Nome do produto *"
            defaultValue={product.name}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sku" className="text-sm font-medium text-foreground">
            SKU / Código de barras *
          </label>
          <div className="flex gap-2">
            <input
              id="sku"
              name="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              placeholder="Digite ou escaneie..."
              className="flex h-9 flex-1 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <BarcodeScanner onScan={(code) => setSku(code)} />
          </div>
        </div>
        <Input
          id="minStock"
          name="minStock"
          type="number"
          step="0.01"
          min="0"
          label={`Estoque mínimo${baseUnitLabel ? ` (${baseUnitLabel})` : ''}`}
          defaultValue={String(product.minStock)}
        />
      </div>

      <Textarea
        id="description"
        name="description"
        label="Descrição"
        defaultValue={product.description ?? ''}
        placeholder="Descrição opcional do produto"
      />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}
