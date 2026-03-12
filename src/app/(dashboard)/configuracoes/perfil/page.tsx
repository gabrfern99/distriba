import { auth } from '@/features/auth/auth'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { ChangePasswordForm } from './change-password-form'

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      <section>
        <h2 className="text-lg font-semibold mb-4">Dados pessoais</h2>
        <ProfileForm name={session.user.name ?? ''} email={session.user.email ?? ''} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Alterar senha</h2>
        <ChangePasswordForm />
      </section>
    </div>
  )
}
