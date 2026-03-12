'use client'

import { useState } from 'react'
import { deleteUnit } from '@/features/estoque/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/toast'

export function DeleteUnitButton({ unitId, unitName }: { unitId: string; unitName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleDelete() {
    setLoading(true)
    const result = await deleteUnit(unitId)
    setLoading(false)
    setOpen(false)
    if (result.error) toast(result.error, 'error')
    else toast('Unidade excluída!')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-destructive hover:underline text-xs">
        Excluir
      </button>
      <ConfirmDialog
        open={open}
        title="Excluir unidade"
        description={`Deseja excluir a unidade "${unitName}"?`}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
        loading={loading}
      />
    </>
  )
}
