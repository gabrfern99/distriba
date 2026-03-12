'use server'

import { updateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireTenantAuth } from '@/lib/auth'
import { generateCode } from '@/lib/utils'
import { InsufficientStockError } from '@/lib/errors'
import { createSaleSchema } from './schemas'

export async function getSales(search?: string, status?: string, page = 1) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where = {
    tenantId,
    ...(status ? { status: status as 'OPEN' | 'COMPLETED' | 'CANCELLED' } : {}),
    ...(search ? { code: { contains: search, mode: 'insensitive' as const } } : {}),
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        user: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.sale.count({ where }),
  ])

  return { sales, total, pages: Math.ceil(total / 50) }
}

export async function getSaleById(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.sale.findFirst({
    where: { id, tenantId },
    include: {
      items: { include: { product: { select: { name: true, sku: true } } } },
      user: { select: { name: true } },
    },
  })
}

export async function createSale(
  _prevState: { error?: string; success?: boolean; saleId?: string } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const itemsRaw = formData.get('items')
  let items: Array<{
    productId: string
    unitName: string
    conversionFactor: number
    quantity: number
    unitPrice: number
  }> = []
  try {
    items = JSON.parse(itemsRaw as string)
  } catch {
    return { error: 'Dados de itens inválidos' }
  }

  const parsed = createSaleSchema.safeParse({
    notes: formData.get('notes') || undefined,
    items,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const count = await prisma.sale.count({ where: { tenantId } })
  const code = generateCode('VEN', count)

  const totalAmount = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )

  const saleItemsData = await Promise.all(
    parsed.data.items.map(async (item) => {
      const product = await prisma.product.findFirstOrThrow({
        where: { id: item.productId, tenantId },
      })
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitName: item.unitName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        conversionFactor: item.conversionFactor,
        baseQuantity: item.quantity * item.conversionFactor,
        subtotal: item.quantity * item.unitPrice,
      }
    }),
  )

  const sale = await prisma.sale.create({
    data: {
      code,
      totalAmount,
      notes: parsed.data.notes,
      userId,
      tenantId,
      status: 'OPEN',
      items: { create: saleItemsData },
    },
  })

  updateTag('sales')
  return { success: true, saleId: sale.id }
}

export async function completeSale(saleId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    })

    if (!sale || sale.status !== 'OPEN') {
      throw new Error('Venda inválida ou já processada')
    }

    for (const item of sale.items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
      })

      const currentStock = parseFloat(product.currentStock.toString())
      const baseQty = parseFloat(item.baseQuantity.toString())

      if (currentStock < baseQty) {
        throw new InsufficientStockError(item.productName)
      }

      const newStock = currentStock - baseQty

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'EXIT',
          origin: 'SALE',
          quantity: baseQty,
          unitName: item.unitName,
          unitQuantity: parseFloat(item.quantity.toString()),
          previousStock: currentStock,
          newStock,
          referenceId: sale.id,
          userId,
          tenantId,
        },
      })

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: newStock },
      })
    }

    await tx.sale.update({
      where: { id: saleId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  })

  updateTag('sales')
  updateTag('products')
  return { success: true }
}

export async function cancelSale(saleId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    })

    if (!sale) throw new Error('Venda não encontrada')
    if (sale.status === 'CANCELLED') throw new Error('Venda já cancelada')

    if (sale.status === 'COMPLETED') {
      for (const item of sale.items) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        })

        const currentStock = parseFloat(product.currentStock.toString())
        const baseQty = parseFloat(item.baseQuantity.toString())
        const newStock = currentStock + baseQty

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'ENTRY',
            origin: 'SALE',
            quantity: baseQty,
            unitName: item.unitName,
            unitQuantity: parseFloat(item.quantity.toString()),
            previousStock: currentStock,
            newStock,
            referenceId: sale.id,
            notes: 'Estorno por cancelamento de venda',
            userId,
            tenantId,
          },
        })

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        })
      }
    }

    await tx.sale.update({
      where: { id: saleId },
      data: { status: 'CANCELLED' },
    })
  })

  updateTag('sales')
  updateTag('products')
  return { success: true }
}
