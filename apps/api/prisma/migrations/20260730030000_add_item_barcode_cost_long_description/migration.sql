-- AlterTable
ALTER TABLE "items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "cost_price" DECIMAL(14,2),
ADD COLUMN     "long_description" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "items_company_id_barcode_key" ON "items"("company_id", "barcode");
