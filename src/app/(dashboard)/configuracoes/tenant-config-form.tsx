'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateCompanySettings } from '@/features/tenants/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Upload, X } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  logoUrl: string | null
}

export function TenantConfigForm({ tenant }: { tenant: Tenant }) {
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(updateCompanySettings, null)
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logoUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoUrlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.success) toast('Dados da empresa atualizados!')
    if (state?.error) toast(state.error, 'error')
  }, [state])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      toast('A imagem deve ter no máximo 500 KB', 'error')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setLogoPreview(dataUrl)
      if (logoUrlInputRef.current) logoUrlInputRef.current.value = dataUrl
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    if (logoUrlInputRef.current) logoUrlInputRef.current.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const initial = tenant.name.charAt(0).toUpperCase()

  return (
    <form action={formAction} className="space-y-6">
      <input ref={logoUrlInputRef} type="hidden" name="logoUrl" defaultValue={tenant.logoUrl ?? ''} />

      {/* Logo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Ícone / Logo da empresa</label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{initial}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {logoPreview ? 'Alterar imagem' : 'Enviar imagem'}
            </button>
            {logoPreview && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Remover
              </button>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG ou SVG · máx. 500 KB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <Input id="name" name="name" label="Nome da empresa *" defaultValue={tenant.name} required />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" loading={isPending}>Salvar</Button>
    </form>
  )
}
