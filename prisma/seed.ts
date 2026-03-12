import 'dotenv/config'
import { PrismaClient, GlobalRole, TenantRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@sistema.com',
      passwordHash: await bcrypt.hash('Admin@123456', 12),
      globalRole: GlobalRole.SUPER_ADMIN,
      tenantRole: TenantRole.OWNER,
    },
  })
  console.log('Super Admin criado:', superAdmin.email)

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'distribuidora-demo' },
    update: {},
    create: {
      name: 'Distribuidora Demo',
      slug: 'distribuidora-demo',
      document: '00.000.000/0001-00',
      email: 'contato@demo.com',
    },
  })
  console.log('Tenant criado:', tenant.slug)

  await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      name: 'Proprietário Demo',
      email: 'owner@demo.com',
      passwordHash: await bcrypt.hash('Owner@123456', 12),
      globalRole: GlobalRole.USER,
      tenantRole: TenantRole.OWNER,
      tenantId: tenant.id,
    },
  })
  console.log('Owner criado: owner@demo.com')

  const existingUnidade = await prisma.unitOfMeasure.findFirst({
    where: { tenantId: tenant.id, abbreviation: 'un' },
  })
  const unidade =
    existingUnidade ??
    (await prisma.unitOfMeasure.create({
      data: { name: 'Unidade', abbreviation: 'un', tenantId: tenant.id },
    }))

  const existingCaixa = await prisma.unitOfMeasure.findFirst({
    where: { tenantId: tenant.id, abbreviation: 'cx' },
  })
  const caixa =
    existingCaixa ??
    (await prisma.unitOfMeasure.create({
      data: { name: 'Caixa', abbreviation: 'cx', tenantId: tenant.id },
    }))

  const existingFardo = await prisma.unitOfMeasure.findFirst({
    where: { tenantId: tenant.id, abbreviation: 'fd' },
  })
  const fardo =
    existingFardo ??
    (await prisma.unitOfMeasure.create({
      data: { name: 'Fardo', abbreviation: 'fd', tenantId: tenant.id },
    }))

  const existingProduct = await prisma.product.findFirst({
    where: { tenantId: tenant.id, sku: '7891000100103' },
  })
  if (!existingProduct) {
    await prisma.product.create({
      data: {
        name: 'Água Mineral 500ml',
        sku: '7891000100103',
        costPrice: 0.8,
        salePrice: 1.5,
        currentStock: 240,
        minStock: 48,
        tenantId: tenant.id,
        productUnits: {
          create: [
            { unitOfMeasureId: caixa.id, conversionFactor: 12 },
            { unitOfMeasureId: fardo.id, conversionFactor: 24 },
          ],
        },
      },
    })

    await prisma.product.create({
      data: {
        name: 'Refrigerante Cola 350ml',
        sku: '7891000200204',
        costPrice: 1.5,
        salePrice: 3.0,
        currentStock: 144,
        minStock: 24,
        tenantId: tenant.id,
        productUnits: {
          create: [{ unitOfMeasureId: caixa.id, conversionFactor: 12 }],
        },
      },
    })

    await prisma.product.create({
      data: {
        name: 'Suco de Laranja 1L',
        sku: '7891000300305',
        costPrice: 3.5,
        salePrice: 6.9,
        currentStock: 36,
        minStock: 12,
        tenantId: tenant.id,
        productUnits: {
          create: [{ unitOfMeasureId: unidade.id, conversionFactor: 1 }],
        },
      },
    })
  }

  const existingSupplier = await prisma.supplier.findFirst({
    where: { tenantId: tenant.id, name: 'Fornecedor Demo' },
  })
  if (!existingSupplier) {
    await prisma.supplier.create({
      data: {
        name: 'Fornecedor Demo',
        document: '11.111.111/0001-11',
        phone: '(11) 99999-9999',
        email: 'vendas@fornecedor.com',
        tenantId: tenant.id,
      },
    })
  }

  console.log('Seed concluído com sucesso!')
  console.log('')
  console.log('Credenciais:')
  console.log('  Super Admin: admin@sistema.com / Admin@123456')
  console.log('  Owner Demo:  owner@demo.com / Owner@123456')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
