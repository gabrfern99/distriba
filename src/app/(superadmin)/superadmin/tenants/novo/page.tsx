import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { TenantCreateForm } from './tenant-create-form'

export default function NovoTenantPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/tenants"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Tenant</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Crie uma nova empresa e seu usuário proprietário
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <TenantCreateForm />
      </div>
    </div>
  )
}
