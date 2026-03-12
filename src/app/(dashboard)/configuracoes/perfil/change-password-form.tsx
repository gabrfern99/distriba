'use client'

import { useActionState, useEffect } from 'react'
import { changePassword } from '@/features/usuarios/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export function ChangePasswordForm() {
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(changePassword, null)

  useEffect(() => {
    if (state?.success) toast('Senha alterada com sucesso!')
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <Input id="currentPassword" name="currentPassword" type="password" label="Senha atual" required />
      <Input id="newPassword" name="newPassword" type="password" label="Nova senha" placeholder="Mínimo 8 caracteres" required />
      <Input id="confirmPassword" name="confirmPassword" type="password" label="Confirmar nova senha" required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" loading={isPending}>Alterar senha</Button>
    </form>
  )
}
