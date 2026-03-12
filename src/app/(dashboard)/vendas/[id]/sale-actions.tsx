'use client'

import { useState } from 'react'
import { cancelSale } from '@/features/vendas/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface SaleActionsProps {
  saleId: string
  status: string
}

export function SaleActions({ saleId, status }: SaleActionsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  if (status === 'CANCELLED') return null

  async function handleCancel() {
    setLoading(true)
    const result = await cancelSale(saleId)
    setLoading(false)
    setOpen(false)
    if ('error' in result && typeof result.error === 'string') {
      toast(result.error, 'error')
    } else {
      toast('Venda cancelada')
      router.refresh()
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Cancelar venda
      </Button>

      <ConfirmDialog
        open={open}
        title="Cancelar venda"
        description={
          status === 'COMPLETED'
            ? 'Esta venda já foi concluída. Ao cancelar, o estoque será estornado automaticamente. Confirmar?'
            : 'Deseja cancelar esta venda?'
        }
        onConfirm={handleCancel}
        onCancel={() => setOpen(false)}
        confirmLabel="Cancelar venda"
        loading={loading}
      />
    </>
  )
}
