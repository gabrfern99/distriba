import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  sku: z.string().min(1, 'SKU é obrigatório').max(50),
  description: z.string().max(500).optional(),
  isActive: z.coerce.boolean().default(true),
})

export const updateProductGeneralSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  sku: z.string().min(1, 'SKU é obrigatório').max(50),
  description: z.string().max(500).optional(),
  minStock: z.coerce.number().min(0).default(0),
})

export const addProductUnitSchema = z.object({
  unitOfMeasureId: z.string().min(1, 'Unidade é obrigatória'),
  conversionFactor: z.coerce.number().positive('Fator deve ser positivo'),
  salePrice: z.coerce.number().min(0, 'Preço de venda deve ser positivo').default(0),
})

export const setBaseUnitSchema = z.object({
  baseUnitId: z.string().min(1, 'Selecione uma unidade base'),
})

export const toggleProductStatusSchema = z.object({
  isActive: z.coerce.boolean(),
})

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  abbreviation: z
    .string()
    .min(1, 'Abreviação é obrigatória')
    .max(10)
    .regex(/^[a-zA-Z]+$/, 'Use apenas letras'),
})

export const createMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['ENTRY', 'EXIT', 'ADJUSTMENT']),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  notes: z.string().max(500).optional(),
})

export const inventoryItemSchema = z.object({
  productId: z.string().min(1),
  countedStock: z.coerce.number().min(0),
  justification: z
    .string()
    .min(5, 'Justificativa é obrigatória (mín. 5 caracteres)'),
})

export const createInventorySchema = z.object({
  notes: z.string().max(500).optional(),
  items: z.array(inventoryItemSchema).min(1, 'Adicione pelo menos 1 item'),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductGeneralInput = z.infer<typeof updateProductGeneralSchema>
export type AddProductUnitInput = z.infer<typeof addProductUnitSchema>
export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type CreateInventoryInput = z.infer<typeof createInventorySchema>
