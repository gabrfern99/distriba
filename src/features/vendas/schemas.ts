import { z } from 'zod'

export const addSaleItemSchema = z.object({
  productId: z.string().min(1),
  unitName: z.string().min(1),
  conversionFactor: z.coerce.number().positive(),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.coerce.number().positive('Preço deve ser positivo'),
})

export const createSaleSchema = z.object({
  notes: z.string().max(500).optional(),
  items: z
    .array(addSaleItemSchema)
    .min(1, 'Venda deve ter pelo menos 1 item'),
})

export type AddSaleItemInput = z.infer<typeof addSaleItemSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>
