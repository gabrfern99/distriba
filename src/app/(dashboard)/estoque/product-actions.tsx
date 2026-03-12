'use client'

import { useState } from 'react'
import { toggleProductStatus } from '@/features/estoque/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/toast'

interface ProductActionsProps {
  productId: string
  productName: string
  isActive: boolean
}

export function ProductActions({ productId, productName, isActive }: ProductActionsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleToggle() {
    setLoading(true)
    const result = await toggleProductStatus(productId)
    setLoading(false)
    setOpen(false)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast(isActive ? 'Produto desativado com sucesso' : 'Produto reativado com sucesso')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`hover:underline text-xs ${isActive ? 'text-destructive' : 'text-primary'}`}
      >
        {isActive ? 'Desativar' : 'Reativar'}
      </button>

      <ConfirmDialog
        open={open}
        title={isActive ? 'Desativar produto' : 'Reativar produto'}
        description={
          isActive
            ? `Deseja desativar o produto "${productName}"? Ele não aparecerá mais nas listagens mas o histórico será mantido.`
            : `Deseja reativar o produto "${productName}"? Ele voltará a aparecer nas listagens.`
        }
        onConfirm={handleToggle}
        onCancel={() => setOpen(false)}
        confirmLabel={isActive ? 'Desativar' : 'Reativar'}
        loading={loading}
      />
    </>
  )
}
