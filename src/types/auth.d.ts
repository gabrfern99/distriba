import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      globalRole: string
      tenantId?: string
      tenantRole: string
    } & DefaultSession['user']
  }

  interface User {
    globalRole: string
    tenantId?: string
    tenantRole: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    globalRole: string
    tenantId?: string
    tenantRole: string
  }
}
