'use server'

import { updateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireTenantAuth } from '@/lib/auth'
import { generateCode } from '@/lib/utils'
import { createSupplierSchema, createPurchaseOrderSchema } from './schemas'

// ==================== FORNECEDORES ====================

export async function getSuppliers(search?: string, page = 1, perPage = 10) {
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
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.supplier.count({ where }),
  ])

  return { suppliers, total, pages: Math.ceil(total / perPage) }
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
      take: 10,
      skip: (page - 1) * 10,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return { orders, total, pages: Math.ceil(total / 10) }
}

export async function getPurchaseOrderById(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: {
      supplier: true,
      items: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              baseUnitName: true,
              productUnits: {
                include: {
                  unitOfMeasure: { select: { name: true, abbreviation: true } },
                },
              },
            },
          },
        },
      },
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

  if (parsed.data.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: parsed.data.supplierId, tenantId },
    })
    if (!supplier) return { error: 'Fornecedor não encontrado' }
  }

  const count = await prisma.purchaseOrder.count({ where: { tenantId } })
  const code = generateCode('PED', count)

  const totalAmount = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )

  const order = await prisma.purchaseOrder.create({
    data: {
      code,
      supplierId: parsed.data.supplierId || undefined,
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
      where: { id, tenantId, status: { in: ['DRAFT', 'SENT'] } },
      include: { items: true },
    })
    if (!order) throw new Error('Pedido não encontrado ou já concluído/cancelado')

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

async function recalcOrderTotal(orderId: string) {
  const items = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: orderId },
  })
  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.subtotal.toString()),
    0,
  )
  await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { totalAmount: total },
  })
}

export async function updatePurchaseOrderItem(
  itemId: string,
  data: { quantity: number; unitPrice: number; unitName: string; conversionFactor: number },
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const item = await prisma.purchaseOrderItem.findUnique({
    where: { id: itemId },
    include: { purchaseOrder: { select: { tenantId: true, status: true, id: true } } },
  })
  if (!item || item.purchaseOrder.tenantId !== tenantId) {
    return { error: 'Item não encontrado' }
  }
  if (item.purchaseOrder.status === 'COMPLETED' || item.purchaseOrder.status === 'CANCELLED') {
    return { error: 'Pedido não pode ser editado' }
  }

  const subtotal = Math.round(data.quantity * data.unitPrice * 100) / 100
  const baseQuantity = data.quantity * data.conversionFactor

  const updated = await prisma.purchaseOrderItem.update({
    where: { id: itemId },
    data: {
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      unitName: data.unitName,
      conversionFactor: data.conversionFactor,
      baseQuantity,
      subtotal,
    },
  })

  await recalcOrderTotal(item.purchaseOrder.id)
  updateTag('purchase-orders')

  return {
    item: {
      id: updated.id,
      productId: updated.productId,
      productName: updated.productName,
      unitName: updated.unitName,
      unitPrice: Number(updated.unitPrice),
      quantity: Number(updated.quantity),
      conversionFactor: Number(updated.conversionFactor),
      baseQuantity: Number(updated.baseQuantity),
      subtotal: Number(updated.subtotal),
    },
  }
}

export async function deletePurchaseOrderItem(itemId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const item = await prisma.purchaseOrderItem.findUnique({
    where: { id: itemId },
    include: { purchaseOrder: { select: { tenantId: true, status: true, id: true } } },
  })
  if (!item || item.purchaseOrder.tenantId !== tenantId) {
    return { error: 'Item não encontrado' }
  }
  if (item.purchaseOrder.status === 'COMPLETED' || item.purchaseOrder.status === 'CANCELLED') {
    return { error: 'Pedido não pode ser editado' }
  }

  await prisma.purchaseOrderItem.delete({ where: { id: itemId } })
  await recalcOrderTotal(item.purchaseOrder.id)
  updateTag('purchase-orders')

  return { success: true }
}

export async function addPurchaseOrderItem(
  orderId: string,
  data: {
    productId: string
    productName: string
    unitName: string
    conversionFactor: number
    quantity: number
    unitPrice: number
  },
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, tenantId },
  })
  if (!order) return { error: 'Pedido não encontrado' }
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    return { error: 'Pedido não pode ser editado' }
  }

  const subtotal = Math.round(data.quantity * data.unitPrice * 100) / 100
  const baseQuantity = data.quantity * data.conversionFactor

  const created = await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: orderId,
      productId: data.productId,
      productName: data.productName,
      unitName: data.unitName,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
      conversionFactor: data.conversionFactor,
      baseQuantity,
      subtotal,
    },
  })

  await recalcOrderTotal(orderId)
  updateTag('purchase-orders')

  return {
    item: {
      id: created.id,
      productId: created.productId,
      productName: created.productName,
      unitName: created.unitName,
      unitPrice: Number(created.unitPrice),
      quantity: Number(created.quantity),
      conversionFactor: Number(created.conversionFactor),
      baseQuantity: Number(created.baseQuantity),
      subtotal: Number(created.subtotal),
    },
  }
}

export async function searchPurchaseProducts(query: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const normalizedQuery = query.trim()

  if (normalizedQuery.length < 1) {
    return { products: [] }
  }

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: normalizedQuery, mode: 'insensitive' } },
        { sku: { contains: normalizedQuery, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 20,
    select: {
      id: true,
      name: true,
      sku: true,
      baseUnitName: true,
      productUnits: {
        include: {
          unitOfMeasure: { select: { name: true, abbreviation: true } },
        },
      },
    },
  })

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      baseUnitName: p.baseUnitName,
      productUnits: p.productUnits.map((pu) => ({
        unitName: pu.unitOfMeasure.name,
        abbreviation: pu.unitOfMeasure.abbreviation,
        conversionFactor: Number(pu.conversionFactor),
      })),
    })),
  }
}
