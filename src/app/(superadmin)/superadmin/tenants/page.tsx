import { getTenants } from '@/features/tenants/actions'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Building2, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { TenantStatusToggle } from './tenant-status-toggle'

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const currentPage = Number(page) || 1
  const { tenants, total, pages } = await getTenants(q, currentPage)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} empresa{total !== 1 ? 's' : ''} cadastrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/superadmin/tenants/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Novo tenant
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou slug..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
        />
        {q && (
          <Link
            href="/superadmin/tenants"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-1"
          >
            ✕
          </Link>
        )}
      </form>

      {/* Table */}
      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q ? `Nenhum tenant encontrado para "${q}"` : 'Nenhum tenant cadastrado'}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Empresa
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Usuários
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Produtos
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Vendas
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={tenant.isActive ? 'success' : 'destructive'}>
                      {tenant.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    {tenant._count.users}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                    {tenant._count.products}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                    {tenant._count.sales}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/superadmin/tenants/${tenant.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Editar
                      </Link>
                      <TenantStatusToggle
                        tenantId={tenant.id}
                        tenantName={tenant.name}
                        isActive={tenant.isActive}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
              <p className="text-xs text-muted-foreground">
                Página {currentPage} de {pages} ({total} total)
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${currentPage - 1}`}
                    className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted/60 transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {currentPage < pages && (
                  <Link
                    href={`?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${currentPage + 1}`}
                    className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted/60 transition-colors"
                  >
                    Próximo →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
