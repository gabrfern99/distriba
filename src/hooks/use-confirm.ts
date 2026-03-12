import { useState, useCallback } from 'react'

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((): Promise<boolean> => {
    setOpen(true)
    return new Promise((res) => {
      setResolve(() => res)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setOpen(false)
    resolve?.(true)
  }, [resolve])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolve?.(false)
  }, [resolve])

  return { open, confirm, handleConfirm, handleCancel }
}
