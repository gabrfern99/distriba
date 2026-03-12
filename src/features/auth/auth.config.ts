import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isDashboard =
        nextUrl.pathname.startsWith('/estoque') ||
        nextUrl.pathname.startsWith('/vendas') ||
        nextUrl.pathname.startsWith('/compras') ||
        nextUrl.pathname.startsWith('/configuracoes')
      const isSuperAdmin = nextUrl.pathname.startsWith('/superadmin')

      if (isDashboard) {
        if (!isLoggedIn) return false
        if (!auth?.user?.tenantId) return false
        return true
      }

      if (isSuperAdmin) {
        if (!isLoggedIn) return false
        if (auth?.user?.globalRole !== 'SUPER_ADMIN') return false
        return true
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.globalRole = user.globalRole
        token.tenantId = user.tenantId
        token.tenantRole = user.tenantRole
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.globalRole = token.globalRole as string
        session.user.tenantId = token.tenantId as string | undefined
        session.user.tenantRole = token.tenantRole as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  providers: [],
}
