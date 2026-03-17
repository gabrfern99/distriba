'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createProduct, lookupGtin } from '@/features/estoque/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { BarcodeScanner } from '@/components/shared/barcode-scanner'
import { useHardwareScanner } from '@/hooks/use-hardware-scanner'
import { Loader2 } from 'lucide-react'

export function CreateProductForm() {
  const router = useRouter()
  const { toast } = useToast()

  const [state, formAction, isPending] = useActionState(createProduct, null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [filledByCosmos, setFilledByCosmos] = useState(false)
  const lastLookedUp = useRef('')

  async function tryLookup(code: string) {
    const trimmed = code.trim()
    if (!trimmed || trimmed === lastLookedUp.current) return
    lastLookedUp.current = trimmed
    setLookingUp(true)
    setFilledByCosmos(false)
    try {
      const result = await lookupGtin(trimmed)
      if (result?.name) {
        setName(result.name)
        if (result?.description) setDescription(result.description)
        setFilledByCosmos(true)
        toast('Dados preenchidos via Cosmos Bluesoft')
      }
    } finally {
      setLookingUp(false)
    }
  }

  function handleScan(code: string) {
    setSku(code)
    tryLookup(code)
  }

  useHardwareScanner(handleScan)

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
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Nome do produto *
              {lookingUp && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground font-normal">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando...
                </span>
              )}
              {!lookingUp && filledByCosmos && (
                <span className="ml-2 text-xs text-emerald-600 font-normal">
                  ✓ Cosmos Bluesoft
                </span>
              )}
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nome do produto"
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
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
              onBlur={(e) => tryLookup(e.target.value)}
              required
              placeholder="Digite ou escaneie..."
              className="flex h-9 flex-1 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <BarcodeScanner onScan={handleScan} />
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
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
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
