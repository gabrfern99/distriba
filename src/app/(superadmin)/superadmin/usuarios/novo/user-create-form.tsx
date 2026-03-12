'use client'

import { useActionState, useEffect, useState } from 'react'
import { createUserBySuperAdmin } from '@/features/usuarios/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

type Tenant = { id: string; name: string; slug: string }

export function UserCreateForm({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(createUserBySuperAdmin, null)
  const [globalRole, setGlobalRole] = useState<'USER' | 'SUPER_ADMIN'>('USER')
  const [tenantId, setTenantId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  useEffect(() => {
    if (state?.success) {
      toast('Usuário criado com sucesso!')
      router.push('/superadmin/usuarios')
    }
    if (state?.error) toast(state.error, 'error')
  }, [state])

  function handleSubmit(formData: FormData) {
    if (passwordsMismatch || confirmPassword.length === 0) {
      toast('As senhas não conferem', 'error')
      return
    }
    formAction(formData)
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Dados do usuário</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="name" name="name" label="Nome *" required />
          <Input id="email" name="email" type="email" label="E-mail *" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Senha *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`flex h-9 w-full rounded-lg border bg-background px-3 pr-10 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  passwordsMatch ? 'border-green-500' : passwordsMismatch ? 'border-destructive' : 'border-border'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar senha *
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repita a senha"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`flex h-9 w-full rounded-lg border bg-background px-3 pr-10 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  passwordsMatch ? 'border-green-500' : passwordsMismatch ? 'border-destructive' : 'border-border'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordsMismatch && (
              <p className="text-xs text-destructive">As senhas não conferem</p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600">Senhas conferem</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 pt-4 border-t border-border">
        <legend className="text-base font-semibold">Papel no sistema</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="globalRole" className="text-sm font-medium">
              Papel global *
            </label>
            <select
              id="globalRole"
              name="globalRole"
              value={globalRole}
              onChange={(e) => {
                setGlobalRole(e.target.value as 'USER' | 'SUPER_ADMIN')
                if (e.target.value === 'SUPER_ADMIN') setTenantId('')
              }}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="USER">Usuário</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
        </div>
      </fieldset>

      {globalRole === 'USER' && (
        <fieldset className="space-y-4 pt-4 border-t border-border">
          <legend className="text-base font-semibold">Vínculo com tenant</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tenantId" className="text-sm font-medium">
                Tenant
              </label>
              <select
                id="tenantId"
                name="tenantId"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— Sem tenant —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>

            {tenantId && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tenantRole" className="text-sm font-medium">
                  Papel no tenant *
                </label>
                <select
                  id="tenantRole"
                  name="tenantRole"
                  defaultValue="OPERATOR"
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="OWNER">Proprietário</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="OPERATOR">Operador</option>
                  <option value="STOCK_MANAGER">Estoque</option>
                </select>
              </div>
            )}
          </div>
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={isPending} disabled={passwordsMismatch}>
          Criar usuário
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/superadmin/usuarios')}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
