'use server'

import { signIn, signOut } from './auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '@/lib/prisma'

export async function login(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'E-mail ou senha inválidos' }
        default:
          return { error: 'Ocorreu um erro ao fazer login' }
      }
    }
    throw error
  }
  return null
}

export async function logout() {
  await signOut({ redirectTo: '/login' })
}

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export async function register(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'Este e-mail já está cadastrado' }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      globalRole: 'USER',
      tenantRole: 'OPERATOR',
    },
  })

  redirect('/login?registered=true')
}
