'use client'

import { useActionState, useState, useEffect } from 'react'
import { createSupplier } from '@/features/compras/actions'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Plus } from 'lucide-react'

export function SupplierForm() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(createSupplier, null)

  useEffect(() => {
    if (state?.success) { toast('Fornecedor criado!'); setOpen(false) }
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo fornecedor
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Novo fornecedor" className="max-w-lg">
        <form action={formAction} className="space-y-4">
          <Input id="name" name="name" label="Nome *" required />
          <div className="grid grid-cols-2 gap-3">
            <Input id="document" name="document" label="CNPJ/CPF" />
            <Input id="phone" name="phone" label="Telefone" />
          </div>
          <Input id="email" name="email" type="email" label="E-mail" />
          <Input id="address" name="address" label="Endereço" />
          <Textarea id="notes" name="notes" label="Observações" />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isPending}>Criar</Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
