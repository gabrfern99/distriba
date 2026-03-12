import { getAllUsers } from '@/features/tenants/actions'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TENANT_ROLE_LABELS, GLOBAL_ROLE_LABELS } from '@/lib/constants'
import { Users, Search, Building2, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const currentPage = Number(page) || 1
  const { users, total, pages } = await getAllUsers(q, currentPage)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários do Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} usuário{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/superadmin/usuarios/novo"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
        />
        {q && (
          <Link
            href="/superadmin/usuarios"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-1"
          >
            ✕
          </Link>
        )}
      </form>

      {/* Table */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
          {q ? `Nenhum usuário encontrado para "${q}"` : 'Nenhum usuário cadastrado.'}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Usuário
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Tenant
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Papel
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Cadastro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    {user.tenant ? (
                      <Link
                        href={`/superadmin/tenants/${user.id}`}
                        className="group flex items-center gap-2"
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm group-hover:text-primary transition-colors">
                            {user.tenant.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {user.tenant.slug}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem tenant</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant={user.globalRole === 'SUPER_ADMIN' ? 'default' : 'outline'}>
                        {GLOBAL_ROLE_LABELS[user.globalRole as keyof typeof GLOBAL_ROLE_LABELS]}
                      </Badge>
                      {user.tenant && (
                        <span className="text-xs text-muted-foreground">
                          {TENANT_ROLE_LABELS[user.tenantRole as keyof typeof TENANT_ROLE_LABELS]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-xs hidden lg:table-cell">
                    {formatDate(user.createdAt)}
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
