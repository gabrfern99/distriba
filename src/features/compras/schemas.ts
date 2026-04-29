import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  document: z.string().max(18).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        productName: z.string().min(1),
        unitName: z.string().min(1),
        conversionFactor: z.coerce.number().positive(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0),
      }),
    )
    .min(1, 'Pedido deve ter pelo menos 1 item'),
  notes: z.string().max(500).optional(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
