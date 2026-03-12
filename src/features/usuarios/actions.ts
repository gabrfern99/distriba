'use server'

import { updateTag } from 'next/cache'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requireAuth, requireTenantAuth, requireSuperAdmin } from '@/lib/auth'
import {
  updateProfileSchema,
  changePasswordSchema,
  inviteUserSchema,
  createUserByAdminSchema,
} from './schemas'

export async function getTenantUsers() {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      tenantRole: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function updateProfile(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireAuth()
  const userId = session.user.id

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: userId } },
  })
  if (existing) return { error: 'Este e-mail já está em uso' }

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, email: parsed.data.email },
  })

  updateTag('profile')
  return { success: true }
}

export async function changePassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireAuth()
  const userId = session.user.id

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user) return { error: 'Usuário não encontrado' }

  const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!match) return { error: 'Senha atual incorreta' }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } })

  return { success: true }
}

export async function inviteUser(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  if (
    session.user.tenantRole !== 'OWNER' &&
    session.user.tenantRole !== 'ADMIN'
  ) {
    return { error: 'Sem permissão para convidar usuários' }
  }

  const parsed = inviteUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    tenantRole: formData.get('tenantRole'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    if (existing.tenantId === tenantId) {
      return { error: 'Este usuário já pertence ao seu tenant' }
    }
    return { error: 'Este e-mail já está cadastrado no sistema' }
  }

  const tempPassword = `Temp@${Math.random().toString(36).slice(2, 10)}`

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(tempPassword, 12),
      globalRole: 'USER',
      tenantRole: parsed.data.tenantRole,
      tenantId,
    },
  })

  updateTag('users')
  return { success: true }
}

export async function createUserBySuperAdmin(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  await requireSuperAdmin()

  const parsed = createUserByAdminSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    globalRole: formData.get('globalRole'),
    tenantId: formData.get('tenantId') || undefined,
    tenantRole: formData.get('tenantRole') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { error: 'Este e-mail já está cadastrado' }

  const tenantId = parsed.data.globalRole === 'SUPER_ADMIN'
    ? null
    : (parsed.data.tenantId || null)

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return { error: 'Tenant não encontrado' }
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      globalRole: parsed.data.globalRole,
      tenantRole: parsed.data.tenantRole ?? 'OPERATOR',
      tenantId,
    },
  })

  updateTag('users')
  return { success: true }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  if (
    session.user.tenantRole !== 'OWNER' &&
    session.user.tenantRole !== 'ADMIN'
  ) {
    return { error: 'Sem permissão' }
  }

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } })
  if (!user) return { error: 'Usuário não encontrado' }

  await prisma.user.update({ where: { id: userId }, data: { isActive } })

  updateTag('users')
  return { success: true }
}
