'use server'

import { updateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireTenantAuth } from '@/lib/auth'
import { generateCode } from '@/lib/utils'
import { createSupplierSchema, createPurchaseOrderSchema } from './schemas'

// ==================== FORNECEDORES ====================

export async function getSuppliers(search?: string, page = 1) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where = {
    tenantId,
    isActive: true,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.supplier.count({ where }),
  ])

  return { suppliers, total, pages: Math.ceil(total / 50) }
}

export async function createSupplier(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const parsed = createSupplierSchema.safeParse({
    name: formData.get('name'),
    document: formData.get('document') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await prisma.supplier.create({
    data: {
      ...parsed.data,
      document: parsed.data.document || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      tenantId,
    },
  })

  updateTag('suppliers')
  return { success: true }
}

export async function updateSupplier(
  id: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const supplier = await prisma.supplier.findFirst({ where: { id, tenantId } })
  if (!supplier) return { error: 'Fornecedor não encontrado' }

  const parsed = createSupplierSchema.safeParse({
    name: formData.get('name'),
    document: formData.get('document') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    address: formData.get('address') || undefined,
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await prisma.supplier.update({
    where: { id },
    data: {
      ...parsed.data,
      document: parsed.data.document || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    },
  })

  updateTag('suppliers')
  return { success: true }
}

export async function deactivateSupplier(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const supplier = await prisma.supplier.findFirst({ where: { id, tenantId } })
  if (!supplier) return { error: 'Fornecedor não encontrado' }

  await prisma.supplier.update({ where: { id }, data: { isActive: false } })

  updateTag('suppliers')
  return { success: true }
}

// ==================== PEDIDOS DE COMPRA ====================

export async function getPurchaseOrders(
  supplierId?: string,
  status?: string,
  page = 1,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where = {
    tenantId,
    ...(status
      ? { status: status as 'DRAFT' | 'SENT' | 'COMPLETED' | 'CANCELLED' }
      : {}),
    ...(supplierId ? { supplierId } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return { orders, total, pages: Math.ceil(total / 50) }
}

export async function getPurchaseOrderById(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: {
      supplier: true,
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  })
}

export async function createPurchaseOrder(
  _prevState: { error?: string; success?: boolean; orderId?: string } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const itemsRaw = formData.get('items')
  let items: Array<{
    productId: string
    productName: string
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

  const parsed = createPurchaseOrderSchema.safeParse({
    supplierId: formData.get('supplierId'),
    notes: formData.get('notes') || undefined,
    items,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: parsed.data.supplierId, tenantId },
  })
  if (!supplier) return { error: 'Fornecedor não encontrado' }

  const count = await prisma.purchaseOrder.count({ where: { tenantId } })
  const code = generateCode('PED', count)

  const totalAmount = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )

  const order = await prisma.purchaseOrder.create({
    data: {
      code,
      supplierId: parsed.data.supplierId,
      totalAmount,
      notes: parsed.data.notes,
      tenantId,
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          unitName: item.unitName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          conversionFactor: item.conversionFactor,
          baseQuantity: item.quantity * item.conversionFactor,
          subtotal: item.quantity * item.unitPrice,
        })),
      },
    },
  })

  updateTag('purchase-orders')
  return { success: true, orderId: order.id }
}

export async function sendPurchaseOrder(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId, status: 'DRAFT' },
  })
  if (!order) return { error: 'Pedido não encontrado ou não está em rascunho' }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date() },
  })

  updateTag('purchase-orders')
  return { success: true }
}

export async function completePurchaseOrder(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: { id, tenantId, status: 'SENT' },
      include: { items: true },
    })
    if (!order) throw new Error('Pedido não encontrado ou não está enviado')

    for (const item of order.items) {
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
          origin: 'PURCHASE_ORDER',
          quantity: baseQty,
          unitName: item.unitName,
          unitQuantity: parseFloat(item.quantity.toString()),
          previousStock: currentStock,
          newStock,
          referenceId: order.id,
          userId,
          tenantId,
        },
      })

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: newStock },
      })
    }

    await tx.purchaseOrder.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  })

  updateTag('purchase-orders')
  updateTag('products')
  return { success: true }
}

export async function cancelPurchaseOrder(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
  })
  if (!order) return { error: 'Pedido não encontrado' }
  if (order.status === 'COMPLETED') {
    return { error: 'Pedido já concluído não pode ser cancelado' }
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  updateTag('purchase-orders')
  return { success: true }
}
