import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  email: z.string().email('E-mail inválido'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação é obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

export const inviteUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  tenantRole: z.enum(['ADMIN', 'OPERATOR', 'STOCK_MANAGER']),
})

export const createUserByAdminSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  globalRole: z.enum(['USER', 'SUPER_ADMIN']),
  tenantId: z.string().optional().or(z.literal('')),
  tenantRole: z.enum(['OWNER', 'ADMIN', 'OPERATOR', 'STOCK_MANAGER']).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
