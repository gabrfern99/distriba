'use client'

import { useState } from 'react'
import { sendPurchaseOrder, completePurchaseOrder, cancelPurchaseOrder } from '@/features/compras/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface PurchaseOrderActionsProps {
  orderId: string
  status: string
}

export function PurchaseOrderActions({ orderId, status }: PurchaseOrderActionsProps) {
  const [dialog, setDialog] = useState<'send' | 'complete' | 'cancel' | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function handle(action: 'send' | 'complete' | 'cancel') {
    setLoading(true)
    let result
    if (action === 'send') result = await sendPurchaseOrder(orderId)
    else if (action === 'complete') result = await completePurchaseOrder(orderId)
    else result = await cancelPurchaseOrder(orderId)
    setLoading(false)
    setDialog(null)
    if ('error' in result && typeof result.error === 'string') toast(result.error, 'error')
    else {
      toast(action === 'send' ? 'Pedido enviado!' : action === 'complete' ? 'Pedido concluído! Estoque atualizado.' : 'Pedido cancelado')
      router.refresh()
    }
  }

  return (
    <div className="flex gap-2">
      {status === 'DRAFT' && (
        <>
          <Button size="sm" variant="outline" onClick={() => setDialog('send')}>Marcar enviado</Button>
          <Button size="sm" variant="destructive" onClick={() => setDialog('cancel')}>Cancelar</Button>
        </>
      )}
      {status === 'SENT' && (
        <>
          <Button size="sm" onClick={() => setDialog('complete')}>Confirmar recebimento</Button>
          <Button size="sm" variant="destructive" onClick={() => setDialog('cancel')}>Cancelar</Button>
        </>
      )}

      <ConfirmDialog
        open={dialog === 'send'}
        title="Marcar como enviado"
        description="Confirmar que o pedido foi enviado ao fornecedor?"
        onConfirm={() => handle('send')}
        onCancel={() => setDialog(null)}
        confirmLabel="Confirmar"
        confirmVariant="default"
        loading={loading}
      />
      <ConfirmDialog
        open={dialog === 'complete'}
        title="Confirmar recebimento"
        description="Ao confirmar, o estoque dos produtos será atualizado com as quantidades do pedido."
        onConfirm={() => handle('complete')}
        onCancel={() => setDialog(null)}
        confirmLabel="Confirmar recebimento"
        confirmVariant="default"
        loading={loading}
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Cancelar pedido"
        description="Deseja cancelar este pedido de compra?"
        onConfirm={() => handle('cancel')}
        onCancel={() => setDialog(null)}
        loading={loading}
      />
    </div>
  )
}
