'use client'

import { useActionState, useEffect } from 'react'
import { createUnit } from '@/features/estoque/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function UnitForm() {
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(createUnit, null)

  useEffect(() => {
    if (state?.success) toast('Unidade criada!')
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <form action={formAction} className="flex gap-3 items-end p-4 rounded-lg border border-border bg-muted/10">
      <Input id="name" name="name" label="Nome" placeholder="ex: Caixa" required />
      <Input id="abbreviation" name="abbreviation" label="Abreviação" placeholder="ex: cx" required className="w-32" />
      <Button type="submit" loading={isPending} className="shrink-0">
        Adicionar
      </Button>
    </form>
  )
}
