'use client'

import { useActionState } from 'react'
import { register } from '@/features/auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null)

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Criar conta</CardTitle>
        <CardDescription>Preencha os dados para criar sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Input
            id="name"
            name="name"
            label="Nome completo"
            placeholder="Seu nome"
            required
          />
          <Input
            id="email"
            name="email"
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            required
          />

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" loading={isPending}>
            Criar conta
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
