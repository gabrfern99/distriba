'use server'

import prisma from '@/lib/prisma'
import { requireTenantAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const REVALIDATE_PATH = '/configuracoes/produtos-mais-vendidos'
const MAX_FEATURED = 20

export async function getFeaturedProducts() {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.featuredProduct.findMany({
    where: { tenantId },
    orderBy: { position: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          salePrice: true,
          isActive: true,
        },
      },
    },
  })
}

export async function searchProductsForFeatured(q: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  if (!q || q.trim().length < 1) return []

  const rows = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { sku: { contains: q.trim(), mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, sku: true, salePrice: true, currentStock: true },
    take: 10,
    orderBy: { name: 'asc' },
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    salePrice: Number(r.salePrice),
    currentStock: Number(r.currentStock),
  }))
}

export async function addFeaturedProduct(productId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const count = await prisma.featuredProduct.count({ where: { tenantId } })
  if (count >= MAX_FEATURED) {
    return { error: `Limite de ${MAX_FEATURED} produtos atingido` }
  }

  const exists = await prisma.featuredProduct.findUnique({
    where: { tenantId_productId: { tenantId, productId } },
  })
  if (exists) {
    return { error: 'Produto já está na lista' }
  }

  await prisma.featuredProduct.create({
    data: { tenantId, productId, position: count + 1 },
  })

  revalidatePath(REVALIDATE_PATH)
  return { success: true }
}

export async function removeFeaturedProduct(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  await prisma.featuredProduct.delete({ where: { id, tenantId } })

  const remaining = await prisma.featuredProduct.findMany({
    where: { tenantId },
    orderBy: { position: 'asc' },
  })

  await prisma.$transaction(
    remaining.map((fp, i) =>
      prisma.featuredProduct.update({ where: { id: fp.id }, data: { position: i + 1 } }),
    ),
  )

  revalidatePath(REVALIDATE_PATH)
  return { success: true }
}

export async function reorderFeaturedProducts(orderedIds: string[]) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.featuredProduct.update({
        where: { id, tenantId },
        data: { position: i + 1 },
      }),
    ),
  )

  revalidatePath(REVALIDATE_PATH)
  return { success: true }
}

export async function toggleShowInPdv(id: string, showInPdv: boolean) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  await prisma.featuredProduct.update({
    where: { id, tenantId },
    data: { showInPdv },
  })

  revalidatePath(REVALIDATE_PATH)
  return { success: true }
}

export async function getFeaturedProductsForPdv() {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const rows = await prisma.featuredProduct.findMany({
    where: { tenantId, showInPdv: true },
    orderBy: { position: 'asc' },
    take: 10,
    include: {
      product: {
        select: { id: true, name: true, sku: true, salePrice: true },
      },
    },
  })

  return rows.map((r) => ({
    productId: r.product.id,
    name: r.product.name,
    sku: r.product.sku,
    salePrice: Number(r.product.salePrice),
  }))
}
