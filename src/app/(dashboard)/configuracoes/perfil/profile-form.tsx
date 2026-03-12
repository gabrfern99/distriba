'use client'

import { useActionState, useEffect } from 'react'
import { updateProfile } from '@/features/usuarios/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(updateProfile, null)

  useEffect(() => {
    if (state?.success) toast('Perfil atualizado!')
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <Input id="name" name="name" label="Nome" defaultValue={name} required />
      <Input id="email" name="email" type="email" label="E-mail" defaultValue={email} required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" loading={isPending}>Salvar</Button>
    </form>
  )
}
