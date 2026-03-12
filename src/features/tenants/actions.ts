'use server'

import { updateTag } from 'next/cache'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth'
import { createTenantSchema, updateTenantSchema } from './schemas'

export async function getTenants(search?: string, page = 1) {
  await requireSuperAdmin()

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        _count: { select: { users: true, products: true, sales: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.tenant.count({ where }),
  ])

  return { tenants, total, pages: Math.ceil(total / 50) }
}

export async function getTenantById(id: string) {
  await requireSuperAdmin()

  return prisma.tenant.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, tenantRole: true, isActive: true } },
      _count: { select: { users: true, products: true, sales: true, purchaseOrders: true } },
    },
  })
}

export async function createTenant(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  await requireSuperAdmin()

  const parsed = createTenantSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    document: formData.get('document') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zipCode: formData.get('zipCode') || undefined,
    ownerName: formData.get('ownerName'),
    ownerEmail: formData.get('ownerEmail'),
    ownerPassword: formData.get('ownerPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existingSlug = await prisma.tenant.findUnique({
    where: { slug: parsed.data.slug },
  })
  if (existingSlug) return { error: 'Este slug já está em uso' }

  const existingEmail = await prisma.user.findUnique({
    where: { email: parsed.data.ownerEmail },
  })
  if (existingEmail) return { error: 'Este e-mail de proprietário já está cadastrado' }

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        document: parsed.data.document || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        zipCode: parsed.data.zipCode || null,
      },
    })

    await tx.user.create({
      data: {
        name: parsed.data.ownerName,
        email: parsed.data.ownerEmail,
        passwordHash: await bcrypt.hash(parsed.data.ownerPassword, 12),
        globalRole: 'USER',
        tenantRole: 'OWNER',
        tenantId: tenant.id,
      },
    })
  })

  updateTag('tenants')
  return { success: true }
}

export async function updateTenant(
  id: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  await requireSuperAdmin()

  const parsed = updateTenantSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    document: formData.get('document') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zipCode: formData.get('zipCode') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) return { error: 'Tenant não encontrado' }

  if (parsed.data.slug && parsed.data.slug !== tenant.slug) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: parsed.data.slug },
    })
    if (existing) return { error: 'Este slug já está em uso' }
  }

  await prisma.tenant.update({
    where: { id },
    data: {
      ...parsed.data,
      document: parsed.data.document || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zipCode: parsed.data.zipCode || null,
    },
  })

  updateTag('tenants')
  return { success: true }
}

export async function toggleTenantStatus(id: string, isActive: boolean) {
  await requireSuperAdmin()

  await prisma.tenant.update({ where: { id }, data: { isActive } })

  updateTag('tenants')
  return { success: true }
}

export async function getAllUsers(search?: string, page = 1) {
  await requireSuperAdmin()

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { tenant: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, pages: Math.ceil(total / 50) }
}
