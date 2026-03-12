'use client'

import { useState } from 'react'
import { toggleUserStatus } from '@/features/usuarios/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface UserStatusToggleProps {
  userId: string
  isActive: boolean
  userName: string
}

export function UserStatusToggle({ userId, isActive, userName }: UserStatusToggleProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const result = await toggleUserStatus(userId, !isActive)
    setLoading(false)
    setOpen(false)
    if (result.error) toast(result.error, 'error')
    else { toast(`Usuário ${isActive ? 'desativado' : 'ativado'}`); router.refresh() }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={`text-xs hover:underline ${isActive ? 'text-destructive' : 'text-primary'}`}>
        {isActive ? 'Desativar' : 'Ativar'}
      </button>
      <ConfirmDialog
        open={open}
        title={isActive ? 'Desativar usuário' : 'Ativar usuário'}
        description={`Deseja ${isActive ? 'desativar' : 'ativar'} o usuário "${userName}"?`}
        onConfirm={handle}
        onCancel={() => setOpen(false)}
        confirmLabel={isActive ? 'Desativar' : 'Ativar'}
        confirmVariant={isActive ? 'destructive' : 'default'}
        loading={loading}
      />
    </>
  )
}
