'use client'

import { useState } from 'react'
import { toggleProductStatus, deleteProduct } from '@/features/estoque/actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/ui/toast'

interface ProductActionsProps {
  productId: string
  productName: string
  isActive: boolean
}

export function ProductActions({ productId, productName, isActive }: ProductActionsProps) {
  const [toggleOpen, setToggleOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleToggle() {
    setLoading(true)
    const result = await toggleProductStatus(productId)
    setLoading(false)
    setToggleOpen(false)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast(isActive ? 'Produto desativado com sucesso' : 'Produto reativado com sucesso')
    }
  }

  async function handleDelete() {
    setLoading(true)
    const result = await deleteProduct(productId)
    setLoading(false)
    setDeleteOpen(false)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Produto excluído com sucesso')
    }
  }

  return (
    <>
      <button
        onClick={() => setToggleOpen(true)}
        className={`hover:underline text-xs ${isActive ? 'text-destructive' : 'text-primary'}`}
      >
        {isActive ? 'Desativar' : 'Reativar'}
      </button>

      <button
        onClick={() => setDeleteOpen(true)}
        className="hover:underline text-xs text-destructive"
      >
        Excluir
      </button>

      <ConfirmDialog
        open={toggleOpen}
        title={isActive ? 'Desativar produto' : 'Reativar produto'}
        description={
          isActive
            ? `Deseja desativar o produto "${productName}"? Ele não aparecerá mais nas listagens mas o histórico será mantido.`
            : `Deseja reativar o produto "${productName}"? Ele voltará a aparecer nas listagens.`
        }
        onConfirm={handleToggle}
        onCancel={() => setToggleOpen(false)}
        confirmLabel={isActive ? 'Desativar' : 'Reativar'}
        loading={loading}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir produto"
        description={`Deseja excluir permanentemente o produto "${productName}"? Esta ação não pode ser desfeita. Se o produto possuir registros vinculados, a exclusão será bloqueada.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        confirmLabel="Excluir"
        loading={loading}
      />
    </>
  )
}
