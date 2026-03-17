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

export async function getMovements(productId?: string, page = 1, perPage = 50) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId

  const where = {
    tenantId,
    ...(productId ? { productId } : {}),
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

export async function completeInventory(id: string) {
  const session = await requireTenantAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findFirstOrThrow({
      where: { id, tenantId, status: 'OPEN' },
      include: { items: true },
    })

    for (const item of inventory.items) {
      const product = await tx.product.findFirstOrThrow({
        where: { id: item.productId },
      })
      const prev = parseFloat(product.currentStock.toString())
      const newStock = item.countedStock

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'ADJUSTMENT',
          origin: 'INVENTORY_ADJUSTMENT',
          quantity: Math.abs(parseFloat(item.difference.toString())),
          previousStock: prev,
          newStock: parseFloat(newStock.toString()),
          referenceId: inventory.id,
          userId,
          tenantId,
        },
      })

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: parseFloat(newStock.toString()) },
      })
    }

    await tx.inventory.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  })

  updateTag('inventories')
  updateTag('products')
  return { success: true }
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
