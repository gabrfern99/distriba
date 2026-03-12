'use client'

import { useActionState, useEffect } from 'react'
import { updateTenant } from '@/features/tenants/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface Tenant {
  id: string
  name: string
  slug: string
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

export function TenantConfigForm({ tenant }: { tenant: Tenant }) {
  const { toast } = useToast()
  const action = updateTenant.bind(null, tenant.id)
  const [state, formAction, isPending] = useActionState(action, null)

  useEffect(() => {
    if (state?.success) toast('Dados da empresa atualizados!')
    if (state?.error) toast(state.error, 'error')
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input id="name" name="name" label="Nome da empresa *" defaultValue={tenant.name} required />
        </div>
        <Input id="slug" name="slug" label="Slug (URL)" defaultValue={tenant.slug} />
        <Input id="document" name="document" label="CNPJ" defaultValue={tenant.document ?? ''} />
        <Input id="phone" name="phone" label="Telefone" defaultValue={tenant.phone ?? ''} />
        <Input id="email" name="email" type="email" label="E-mail" defaultValue={tenant.email ?? ''} />
        <div className="sm:col-span-2">
          <Input id="address" name="address" label="Endereço" defaultValue={tenant.address ?? ''} />
        </div>
        <Input id="city" name="city" label="Cidade" defaultValue={tenant.city ?? ''} />
        <Input id="state" name="state" label="Estado (UF)" maxLength={2} defaultValue={tenant.state ?? ''} />
        <Input id="zipCode" name="zipCode" label="CEP" defaultValue={tenant.zipCode ?? ''} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" loading={isPending}>Salvar</Button>
    </form>
  )
}
