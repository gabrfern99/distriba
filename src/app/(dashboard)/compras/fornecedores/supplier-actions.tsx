'use client'

import { useState } from 'react'
import { deactivateSupplier } from '@/features/compras/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/toast'

interface Supplier {
  id: string
  name: string
}

export function SupplierActions({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleDeactivate() {
    setLoading(true)
    const result = await deactivateSupplier(supplier.id)
    setLoading(false)
    setOpen(false)
    if (result.error) toast(result.error, 'error')
    else toast('Fornecedor desativado')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-destructive hover:underline text-xs">
        Desativar
      </button>
      <ConfirmDialog
        open={open}
        title="Desativar fornecedor"
        description={`Deseja desativar "${supplier.name}"?`}
        onConfirm={handleDeactivate}
        onCancel={() => setOpen(false)}
        loading={loading}
      />
    </>
  )
}
