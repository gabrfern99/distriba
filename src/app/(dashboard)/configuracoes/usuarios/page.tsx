import { getTenantUsers } from '@/features/usuarios/actions'
import { formatDate } from '@/lib/utils'
import { TENANT_ROLE_LABELS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { InviteUserForm } from './invite-user-form'
import { UserStatusToggle } from './user-status-toggle'

export default async function UsuariosPage() {
  const users = await getTenantUsers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">{users.length} usuário(s)</p>
        </div>
        <InviteUserForm />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Usuário</th>
              <th className="text-left px-4 py-3 font-medium">Perfil</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {TENANT_ROLE_LABELS[user.tenantRole as keyof typeof TENANT_ROLE_LABELS]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? 'success' : 'destructive'}>
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <UserStatusToggle userId={user.id} isActive={user.isActive} userName={user.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
