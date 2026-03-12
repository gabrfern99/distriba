'use client'

import { useActionState, useEffect, useState } from 'react'
import { createProduct } from '@/features/estoque/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { BarcodeScanner } from '@/components/shared/barcode-scanner'

export function CreateProductForm() {
  const router = useRouter()
  const { toast } = useToast()

  const [state, formAction, isPending] = useActionState(createProduct, null)
  const [sku, setSku] = useState('')

  useEffect(() => {
    if (state?.success && state.productId) {
      toast('Produto criado!')
      router.push(`/estoque/${state.productId}/editar`)
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
        <div className="flex flex-col gap-1">
          <label htmlFor="isActive" className="text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="isActive"
            name="isActive"
            defaultValue="true"
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>

      <Textarea
        id="description"
        name="description"
        label="Descrição"
        placeholder="Descrição opcional do produto"
      />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          Criar produto
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/estoque')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
