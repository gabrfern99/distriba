import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof createPrismaClient>
} & typeof global

const prisma = globalThis.prismaGlobal ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

export default prisma
