'use server'

import { updateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireTenantAuth } from '@/lib/auth'
import { generateCode } from '@/lib/utils'
import { InsufficientStockError } from '@/lib/errors'
import {
  createProductSchema,
  updateProductGeneralSchema,
  addProductUnitSchema,
  createUnitSchema,
  createMovementSchema,
  createInventorySchema,
  inventoryItemSchema,
  updateInventoryItemSchema,
} from './schemas'

// ==================== PRODUTOS ====================

export async function getProducts(
  search?: string,
  page = 1,
  lowStockOnly = false,
  statusFilter?: 'all' | 'active' | 'inactive',
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const isActiveFilter =
    statusFilter === 'inactive' ? false : statusFilter === 'all' ? undefined : true

  const where = {
    tenantId,
    ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const include = {
    productUnits: { include: { unitOfMeasure: true } },
    baseUnit: { include: { unitOfMeasure: true } },
  }

  if (lowStockOnly) {
    const all = await prisma.product.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
    })
    const filtered = all.filter((p) => Number(p.currentStock) <= Number(p.minStock))
    return { products: filtered, total: filtered.length, pages: 1 }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, pages: Math.ceil(total / 50) }
}

export async function getProductById(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      productUnits: { include: { unitOfMeasure: true } },
      baseUnit: { include: { unitOfMeasure: true } },
    },
  })
}

export async function createProduct(
  _prevState: { error?: string; success?: boolean; productId?: string } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const raw = {
    name: formData.get('name'),
    sku: formData.get('sku'),
    description: formData.get('description') || undefined,
    isActive: formData.get('isActive') ?? 'true',
  }

  const parsed = createProductSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.product.findFirst({
    where: { tenantId, sku: parsed.data.sku },
  })
  if (existing) {
    return { error: 'Já existe um produto com este SKU' }
  }

  const created = await prisma.product.create({
    data: { ...parsed.data, tenantId },
  })

  updateTag('products')
  return { success: true, productId: created.id }
}

export async function updateProductGeneral(
  id: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const raw = {
    name: formData.get('name'),
    sku: formData.get('sku'),
    description: formData.get('description') || undefined,
    minStock: formData.get('minStock'),
  }

  const parsed = updateProductGeneralSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const product = await prisma.product.findFirst({ where: { id, tenantId } })
  if (!product) return { error: 'Produto não encontrado' }

  if (parsed.data.sku !== product.sku) {
    const existing = await prisma.product.findFirst({
      where: { tenantId, sku: parsed.data.sku, id: { not: id } },
    })
    if (existing) return { error: 'Já existe um produto com este SKU' }
  }

  await prisma.product.update({ where: { id }, data: parsed.data })

  updateTag('products')
  return { success: true }
}

export async function addProductUnit(
  productId: string,
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const raw = {
    unitOfMeasureId: formData.get('unitOfMeasureId'),
    conversionFactor: formData.get('conversionFactor'),
    salePrice: formData.get('salePrice'),
  }

  const parsed = addProductUnitSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } })
  if (!product) return { error: 'Produto não encontrado' }

  const existingUnit = await prisma.productUnit.findFirst({
    where: { productId, unitOfMeasureId: parsed.data.unitOfMeasureId },
  })
  if (existingUnit) return { error: 'Esta unidade já está vinculada ao produto' }

  await prisma.productUnit.create({
    data: {
      productId,
      unitOfMeasureId: parsed.data.unitOfMeasureId,
      conversionFactor: parsed.data.conversionFactor,
      salePrice: parsed.data.salePrice,
    },
  })

  updateTag('products')
  return { success: true }
}

export async function removeProductUnit(productUnitId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const pu = await prisma.productUnit.findFirst({
    where: { id: productUnitId },
    include: { product: { select: { tenantId: true, baseUnitId: true } } },
  })
  if (!pu || pu.product.tenantId !== tenantId) return { error: 'Unidade não encontrada' }

  await prisma.$transaction(async (tx) => {
    if (pu.product.baseUnitId === productUnitId) {
      await tx.product.update({
        where: { id: pu.productId },
        data: { baseUnitId: null },
      })
    }
    await tx.productUnit.delete({ where: { id: productUnitId } })
  })

  updateTag('products')
  return { success: true }
}

export async function setBaseUnit(productId: string, baseUnitId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } })
  if (!product) return { error: 'Produto não encontrado' }

  const pu = await prisma.productUnit.findFirst({
    where: { id: baseUnitId, productId },
  })
  if (!pu) return { error: 'Unidade não pertence a este produto' }

  await prisma.product.update({
    where: { id: productId },
    data: { baseUnitId },
  })

  updateTag('products')
  return { success: true }
}

export async function toggleProductStatus(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const product = await prisma.product.findFirst({ where: { id, tenantId } })
  if (!product) return { error: 'Produto não encontrado' }

  await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  })

  updateTag('products')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: {
          stockMovements: true,
          saleItems: true,
          purchaseItems: true,
          inventoryItems: true,
        },
      },
    },
  })
  if (!product) return { error: 'Produto não encontrado' }

  const totalRefs =
    product._count.stockMovements +
    product._count.saleItems +
    product._count.purchaseItems +
    product._count.inventoryItems

  if (totalRefs > 0) {
    return {
      error:
        'Este produto possui registros vinculados (movimentações, vendas, compras ou inventários). Desative-o em vez de excluir.',
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.productUnit.deleteMany({ where: { productId: id } })
    await tx.product.delete({ where: { id } })
  })

  updateTag('products')
  return { success: true }
}

// ==================== UNIDADES ====================

export async function getUnits() {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.unitOfMeasure.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  })
}

export async function createUnit(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const parsed = createUnitSchema.safeParse({
    name: formData.get('name'),
    abbreviation: formData.get('abbreviation'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.unitOfMeasure.findFirst({
    where: { tenantId, abbreviation: parsed.data.abbreviation },
  })
  if (existing) {
    return { error: 'Já existe uma unidade com esta abreviação' }
  }

  await prisma.unitOfMeasure.create({
    data: { ...parsed.data, tenantId },
  })

  updateTag('units')
  return { success: true }
}

export async function deleteUnit(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const unit = await prisma.unitOfMeasure.findFirst({
    where: { id, tenantId },
    include: { productUnits: true },
  })
  if (!unit) return { error: 'Unidade não encontrada' }
  if (unit.productUnits.length > 0) {
    return { error: 'Esta unidade está em uso por produtos' }
  }

  await prisma.unitOfMeasure.delete({ where: { id } })

  updateTag('units')
  return { success: true }
}

// ==================== MOVIMENTAÇÕES ====================

export async function getProductsWithLastMovement(
  search?: string,
  page = 1,
  perPage = 50,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where = {
    tenantId,
    stockMovements: { some: {} },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        baseUnit: { include: { unitOfMeasure: true } },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, pages: Math.ceil(total / perPage) }
}

export async function getMovements(
  productId?: string,
  page = 1,
  perPage = 50,
  filters?: {
    dateFrom?: string
    dateTo?: string
    type?: string
    origin?: string
  },
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where: Record<string, unknown> = {
    tenantId,
    ...(productId ? { productId } : {}),
  }

  if (filters?.type) {
    where.type = filters.type
  }
  if (filters?.origin) {
    where.origin = filters.origin
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const createdAt: Record<string, Date> = {}
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom + 'T00:00:00')
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo + 'T23:59:59')
    where.createdAt = createdAt
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            baseUnitId: true,
            baseUnit: { include: { unitOfMeasure: true } },
            productUnits: { include: { unitOfMeasure: true } },
          },
        },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return { movements, total, pages: Math.ceil(total / perPage) }
}

export async function createMovement(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const parsed = createMovementSchema.safeParse({
    productId: formData.get('productId'),
    type: formData.get('type'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, tenantId },
  })
  if (!product) return { error: 'Produto não encontrado' }

  const qty = parsed.data.quantity
  const prev = parseFloat(product.currentStock.toString())
  let newStock: number

  if (parsed.data.type === 'ENTRY') {
    newStock = prev + qty
  } else if (parsed.data.type === 'EXIT') {
    if (prev < qty) throw new InsufficientStockError(product.name)
    newStock = prev - qty
  } else {
    newStock = qty
  }

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: parsed.data.type,
        origin: 'MANUAL',
        quantity: qty,
        previousStock: prev,
        newStock,
        notes: parsed.data.notes,
        userId,
        tenantId,
      },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    }),
  ])

  updateTag('products')
  updateTag('movements')
  return { success: true }
}

// ==================== INVENTÁRIO ====================

export async function getInventories(page = 1) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where = { tenantId }

  const [inventories, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: {
        user: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.inventory.count({ where }),
  ])

  return { inventories, total, pages: Math.ceil(total / 50) }
}

export async function getInventoryById(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  return prisma.inventory.findFirst({
    where: { id, tenantId },
    include: {
      user: { select: { name: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              baseUnitName: true,
              baseUnit: {
                select: {
                  unitOfMeasure: {
                    select: {
                      abbreviation: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      _count: { select: { items: true } },
    },
  })
}

export async function searchInventoryProducts(query: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const normalizedQuery = query.trim()

  if (normalizedQuery.length < 2) {
    return { products: [] }
  }

  const products = await prisma.product.findMany({
    where: {
      tenantId,
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
      baseUnit: {
        select: {
          unitOfMeasure: {
            select: {
              abbreviation: true,
            },
          },
        },
      },
      currentStock: true,
      isActive: true,
    },
  })

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      baseUnitLabel: product.baseUnit?.unitOfMeasure.abbreviation ?? product.baseUnitName,
      currentStock: Number(product.currentStock),
      isActive: product.isActive,
    })),
  }
}

export async function createInventory(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const itemsRaw = formData.get('items')
  let items: Array<{ productId: string; countedStock: number; justification: string }> = []
  try {
    items = JSON.parse(itemsRaw as string)
  } catch {
    return { error: 'Dados de itens inválidos' }
  }

  const parsed = createInventorySchema.safeParse({
    notes: formData.get('notes') || undefined,
    items,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const count = await prisma.inventory.count({ where: { tenantId } })
  const code = generateCode('INV', count)

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.create({
      data: {
        code,
        notes: parsed.data.notes,
        userId,
        tenantId,
      },
    })

    for (const item of parsed.data.items) {
      const product = await tx.product.findFirstOrThrow({
        where: { id: item.productId, tenantId },
      })
      const systemStock = parseFloat(product.currentStock.toString())
      const difference = item.countedStock - systemStock

      await tx.inventoryItem.create({
        data: {
          inventoryId: inventory.id,
          productId: item.productId,
          systemStock,
          countedStock: item.countedStock,
          difference,
          justification: item.justification,
        },
      })
    }

    return inventory
  })

  updateTag('inventories')
  return { success: true }
}

export async function addInventoryItem(
  inventoryId: string,
  input: { productId: string; countedStock: number; justification: string },
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const parsed = inventoryItemSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const inventory = await prisma.inventory.findFirst({
    where: { id: inventoryId, tenantId },
    select: { id: true, status: true },
  })

  if (!inventory) return { error: 'Inventário não encontrado' }
  if (inventory.status !== 'OPEN') {
    return { error: 'Apenas inventários em aberto podem ser alterados' }
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, tenantId },
    select: {
      id: true,
      name: true,
      sku: true,
      baseUnitName: true,
      baseUnit: {
        select: {
          unitOfMeasure: {
            select: {
              abbreviation: true,
            },
          },
        },
      },
      currentStock: true,
    },
  })

  if (!product) return { error: 'Produto não encontrado' }

  const existingItem = await prisma.inventoryItem.findFirst({
    where: {
      inventoryId,
      productId: parsed.data.productId,
    },
    select: { id: true },
  })

  if (existingItem) {
    return { error: 'Este produto já foi adicionado ao inventário' }
  }

  const systemStock = Number(product.currentStock)
  const difference = parsed.data.countedStock - systemStock

  const item = await prisma.inventoryItem.create({
    data: {
      inventoryId,
      productId: parsed.data.productId,
      systemStock,
      countedStock: parsed.data.countedStock,
      difference,
      justification: parsed.data.justification,
    },
  })

  updateTag('inventories')

  return {
    success: true,
    item: {
      id: item.id,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      baseUnitLabel: product.baseUnit?.unitOfMeasure.abbreviation ?? product.baseUnitName,
      systemStock: Number(item.systemStock),
      countedStock: Number(item.countedStock),
      difference: Number(item.difference),
      justification: item.justification,
    },
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: { countedStock: number; justification: string },
) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const parsed = updateInventoryItemSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      inventory: { is: { tenantId } },
    },
    include: {
      inventory: { select: { status: true } },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          baseUnitName: true,
          baseUnit: {
            select: {
              unitOfMeasure: {
                select: {
                  abbreviation: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!item) return { error: 'Item de inventário não encontrado' }
  if (item.inventory.status !== 'OPEN') {
    return { error: 'Apenas inventários em aberto podem ser editados' }
  }

  const difference = parsed.data.countedStock - Number(item.systemStock)

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      countedStock: parsed.data.countedStock,
      difference,
      justification: parsed.data.justification,
    },
  })

  updateTag('inventories')

  return {
    success: true,
    item: {
      id: updated.id,
      productId: item.product.id,
      productName: item.product.name,
      productSku: item.product.sku,
      baseUnitLabel: item.product.baseUnit?.unitOfMeasure.abbreviation ?? item.product.baseUnitName,
      systemStock: Number(updated.systemStock),
      countedStock: Number(updated.countedStock),
      difference: Number(updated.difference),
      justification: updated.justification,
    },
  }
}

export async function deleteInventoryItem(itemId: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      inventory: { is: { tenantId } },
    },
    include: {
      inventory: { select: { id: true, status: true } },
      product: { select: { name: true } },
    },
  })

  if (!item) return { error: 'Item de inventário não encontrado' }
  if (item.inventory.status !== 'OPEN') {
    return { error: 'Apenas inventários em aberto podem ser alterados' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const totalItems = await tx.inventoryItem.count({
      where: { inventoryId: item.inventory.id },
    })

    if (totalItems <= 1) {
      return { error: 'O inventário precisa ter pelo menos 1 item' }
    }

    await tx.inventoryItem.delete({ where: { id: itemId } })
    return { success: true }
  })

  if ('error' in result) return result

  updateTag('inventories')
  return { success: true }
}

export async function completeInventory(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const result = await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findFirst({
      where: { id, tenantId },
      include: { items: true },
    })

    if (!inventory) return { error: 'Inventário não encontrado' }
    if (inventory.status !== 'OPEN') {
      return { error: 'Apenas inventários em aberto podem ser concluídos' }
    }
    if (inventory.items.length === 0) {
      return { error: 'Adicione pelo menos 1 item antes de concluir o inventário' }
    }

    for (const item of inventory.items) {
      const product = await tx.product.findFirstOrThrow({
        where: { id: item.productId, tenantId },
      })
      const prev = parseFloat(product.currentStock.toString())
      const newStock = item.countedStock
      const numericNewStock = Number(newStock)
      const difference = numericNewStock - prev

      if (difference !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'ADJUSTMENT',
            origin: 'INVENTORY_ADJUSTMENT',
            quantity: Math.abs(difference),
            previousStock: prev,
            newStock: numericNewStock,
            referenceId: inventory.id,
            userId,
            tenantId,
          },
        })
      }

      if (difference !== 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: numericNewStock },
        })
      }
    }

    const completedAt = new Date()

    await tx.inventory.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt },
    })

    return { success: true, completedAt: completedAt.toISOString() }
  })

  if ('error' in result) return result

  updateTag('inventories')
  updateTag('products')
  updateTag('movements')
  return result
}

// ==================== COSMOS BLUESOFT ====================

interface CosmosProduct {
  name: string | null
  description: string | null
}

export async function lookupGtin(gtin: string): Promise<CosmosProduct | null> {
  const token = process.env.COSMOS_API_TOKEN
  console.log('[Cosmos] lookupGtin called, gtin:', gtin, '| token set:', !!token)
  if (!token) return null

  try {
    console.log('[Cosmos] fetching...')
    const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(gtin)}`, {
      headers: {
        'X-Cosmos-Token': token,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 },
    })

    if (!res.ok) return null

    const data = await res.json()

    const name: string = data.description ?? ''
    const parts: string[] = []
    if (data.brand?.name) parts.push(data.brand.name)
    if (data.gpc?.description) parts.push(data.gpc.description)
    const description = parts.join(' · ') || null

    return { name: name || null, description }
  } catch {
    return null
  }
}
