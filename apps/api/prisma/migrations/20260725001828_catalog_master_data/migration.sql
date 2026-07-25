-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'PERCEPTION', 'WITHHOLDING');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "preferred_price_list_id" TEXT;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "unit_of_measure" TEXT NOT NULL,
    "tracks_stock" BOOLEAN NOT NULL DEFAULT false,
    "minimum_stock" DECIMAL(14,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TaxType" NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_taxes" (
    "item_id" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,

    CONSTRAINT "item_taxes_pkey" PRIMARY KEY ("item_id","tax_id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "price_list_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("price_list_id","item_id")
);

-- CreateIndex
CREATE INDEX "categories_company_id_idx" ON "categories"("company_id");

-- CreateIndex
CREATE INDEX "categories_company_id_parent_id_idx" ON "categories"("company_id", "parent_id");

-- CreateIndex
CREATE INDEX "items_company_id_idx" ON "items"("company_id");

-- CreateIndex
CREATE INDEX "items_company_id_is_active_idx" ON "items"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "items_company_id_type_idx" ON "items"("company_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "items_company_id_sku_key" ON "items"("company_id", "sku");

-- CreateIndex
CREATE INDEX "taxes_company_id_idx" ON "taxes"("company_id");

-- CreateIndex
CREATE INDEX "price_lists_company_id_idx" ON "price_lists"("company_id");

-- CreateIndex
CREATE INDEX "price_lists_company_id_is_active_idx" ON "price_lists"("company_id", "is_active");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_preferred_price_list_id_fkey" FOREIGN KEY ("preferred_price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_taxes" ADD CONSTRAINT "item_taxes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_taxes" ADD CONSTRAINT "item_taxes_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "taxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint (RN-CAT-08): minimumStock solo tiene sentido si tracksStock=true;
-- se refuerza a nivel de aplicación (400), pero el signo nunca puede ser negativo.
ALTER TABLE "items" ADD CONSTRAINT "items_minimum_stock_non_negative" CHECK ("minimum_stock" IS NULL OR "minimum_stock" >= 0);

-- CheckConstraint (RN-CAT-09): la tasa de un impuesto nunca puede ser negativa.
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_rate_non_negative" CHECK ("rate" >= 0);

-- CheckConstraint (RN-CAT-10): si se informa validTo, debe ser posterior a validFrom.
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_valid_to_after_valid_from" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from");

-- CheckConstraint (RN-CAT-12): el precio de lista nunca puede ser negativo.
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_non_negative" CHECK ("price" >= 0);
