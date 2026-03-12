import { z } from 'zod'

export const createTenantSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens',
    ),
  document: z.string().max(18).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  ownerName: z.string().min(2, 'Nome do proprietário é obrigatório'),
  ownerEmail: z.string().email('E-mail do proprietário inválido'),
  ownerPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export const updateTenantSchema = createTenantSchema
  .omit({ ownerName: true, ownerEmail: true })
  .partial()

export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
