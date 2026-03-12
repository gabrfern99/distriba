-- AlterTable
ALTER TABLE "product_units" ADD COLUMN     "salePrice" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "baseUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "product_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
