-- CreateTable
CREATE TABLE "featured_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "showInPdv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_products_tenantId_productId_key" ON "featured_products"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "featured_products_tenantId_position_idx" ON "featured_products"("tenantId", "position");

-- AddForeignKey
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: make supplierId optional on purchase_orders
ALTER TABLE "purchase_orders" ALTER COLUMN "supplierId" DROP NOT NULL;
