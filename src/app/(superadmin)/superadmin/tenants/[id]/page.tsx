import { getTenantById } from '@/features/tenants/actions'
import { notFound } from 'next/navigation'
import { TenantEditForm } from './tenant-edit-form'
import { Badge } from '@/components/ui/badge'
import { TENANT_ROLE_LABELS } from '@/lib/constants'
import { ArrowLeft, Building2, Users, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenant = await getTenantById(id)

  if (!tenant) notFound()

  const stats = [
    { label: 'Usuários', value: tenant._count.users, icon: Users },
    { label: 'Produtos', value: tenant._count.products, icon: Package },
    { label: 'Vendas', value: tenant._count.sales, icon: ShoppingCart },
    { label: 'Pedidos', value: tenant._count.purchaseOrders, icon: Building2 },
  ]

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/tenants"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{tenant.slug}</p>
        </div>
        <Badge variant={tenant.isActive ? 'success' : 'destructive'} className="ml-auto">
          {tenant.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4 text-center"
          >
            <s.icon className="h-4 w-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold mb-5">Dados do tenant</h2>
        <TenantEditForm tenant={tenant} />
      </div>

      {/* Users */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">
            Usuários{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({tenant.users.length})
            </span>
          </h2>
        </div>

        {tenant.users.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            Nenhum usuário neste tenant.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Usuário
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Perfil
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenant.users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline">
                      {TENANT_ROLE_LABELS[u.tenantRole as keyof typeof TENANT_ROLE_LABELS]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.isActive ? 'success' : 'destructive'}>
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
