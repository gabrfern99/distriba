'use client'

import { useActionState, useState, useEffect } from 'react'
import { inviteUser } from '@/features/usuarios/actions'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { UserPlus } from 'lucide-react'

export function InviteUserForm() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(inviteUser, null)

  useEffect(() => {
    if (state?.success) { toast('Usuário convidado!'); setOpen(false) }
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Convidar usuário
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Convidar usuário">
        <form action={formAction} className="space-y-4">
          <Input id="name" name="name" label="Nome *" required />
          <Input id="email" name="email" type="email" label="E-mail *" required />
          <Select id="tenantRole" name="tenantRole" label="Perfil *">
            <option value="OPERATOR">Operador</option>
            <option value="ADMIN">Administrador</option>
            <option value="STOCK_MANAGER">Estoque</option>
          </Select>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isPending}>Convidar</Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
