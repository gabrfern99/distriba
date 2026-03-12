'use client'

import { useActionState } from 'react'
import { login } from '@/features/auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<{ error: string } | null, FormData>(login, null)

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Distribuidora</CardTitle>
        <CardDescription>Entre com sua conta para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Senha"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" loading={isPending}>
            Entrar
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
