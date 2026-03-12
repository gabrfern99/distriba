import { redirect } from 'next/navigation'
import { auth } from '@/features/auth/auth'

export default async function RootPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.globalRole === 'SUPER_ADMIN') {
    redirect('/superadmin')
  }

  redirect('/dashboard')
}
