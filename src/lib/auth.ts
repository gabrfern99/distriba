import { auth } from '@/features/auth/auth'
import { UnauthorizedError } from './errors'

export async function getServerSession() {
  const session = await auth()
  return session
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new UnauthorizedError()
  }
  return session
}

export async function requireTenantAuth() {
  const session = await requireAuth()
  if (!session.user.tenantId) {
    throw new UnauthorizedError('Usuário sem tenant associado')
  }
  return session as typeof session & { user: { tenantId: string } }
}

export async function requireSuperAdmin() {
  const session = await requireAuth()
  if (session.user.globalRole !== 'SUPER_ADMIN') {
    throw new UnauthorizedError('Acesso restrito ao Super Admin')
  }
  return session
}
