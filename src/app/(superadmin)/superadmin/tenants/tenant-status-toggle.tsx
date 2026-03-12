'use client'

import { useState } from 'react'
import { toggleTenantStatus } from '@/features/tenants/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

export function TenantStatusToggle({
  tenantId,
  tenantName,
  isActive,
}: {
  tenantId: string
  tenantName: string
  isActive: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const result = await toggleTenantStatus(tenantId, !isActive)
    setLoading(false)
    setOpen(false)
    if ('error' in result && typeof result.error === 'string') toast(result.error, 'error')
    else { toast(`Tenant ${isActive ? 'desativado' : 'ativado'}`); router.refresh() }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={`text-xs hover:underline ${isActive ? 'text-destructive' : 'text-primary'}`}>
        {isActive ? 'Desativar' : 'Ativar'}
      </button>
      <ConfirmDialog
        open={open}
        title={isActive ? 'Desativar tenant' : 'Ativar tenant'}
        description={`Deseja ${isActive ? 'desativar' : 'ativar'} o tenant "${tenantName}"?`}
        onConfirm={handle}
        onCancel={() => setOpen(false)}
        confirmVariant={isActive ? 'destructive' : 'default'}
        confirmLabel={isActive ? 'Desativar' : 'Ativar'}
        loading={loading}
      />
    </>
  )
}
