import { getTenants } from '@/features/tenants/actions'
import { UserCreateForm } from './user-create-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NovoUsuarioPage() {
  const { tenants } = await getTenants()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/superadmin/usuarios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para usuários
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo Usuário</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crie um usuário e defina seu papel no sistema.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <UserCreateForm
          tenants={tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
        />
      </div>
    </div>
  )
}
