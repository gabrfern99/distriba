'use client'

import { useActionState, useEffect } from 'react'
import { createTenant } from '@/features/tenants/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

export function TenantCreateForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(createTenant, null)

  useEffect(() => {
    if (state?.success) { toast('Tenant criado!'); router.push('/superadmin/tenants') }
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Dados da empresa</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input id="name" name="name" label="Nome da empresa *" required />
          </div>
          <Input id="slug" name="slug" label="Slug *" placeholder="empresa-demo" required />
          <Input id="document" name="document" label="CNPJ" />
          <Input id="phone" name="phone" label="Telefone" />
          <Input id="email" name="email" type="email" label="E-mail" />
          <div className="sm:col-span-2">
            <Input id="address" name="address" label="Endereço" />
          </div>
          <Input id="city" name="city" label="Cidade" />
          <Input id="state" name="state" label="Estado (UF)" maxLength={2} />
          <Input id="zipCode" name="zipCode" label="CEP" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 pt-4 border-t border-border">
        <legend className="text-base font-semibold">Proprietário (OWNER)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="ownerName" name="ownerName" label="Nome do proprietário *" required />
          <Input id="ownerEmail" name="ownerEmail" type="email" label="E-mail do proprietário *" required />
          <Input id="ownerPassword" name="ownerPassword" type="password" label="Senha *" placeholder="Mínimo 8 caracteres" required />
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>Criar tenant</Button>
        <Button type="button" variant="outline" onClick={() => router.push('/superadmin/tenants')}>Cancelar</Button>
      </div>
    </form>
  )
}
