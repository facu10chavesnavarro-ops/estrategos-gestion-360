-- CreateEnum
CREATE TYPE "VoucherFlow" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "StockEffect" AS ENUM ('IN', 'OUT', 'NONE');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "voucher_id" TEXT;

-- CreateTable
CREATE TABLE "points_of_sale" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_of_sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flow" "VoucherFlow" NOT NULL,
    "affects_stock" "StockEffect" NOT NULL,
    "requires_cae" BOOLEAN NOT NULL,
    "is_credit_note" BOOLEAN NOT NULL DEFAULT false,
    "related_voucher_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "voucher_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_counters" (
    "company_id" TEXT NOT NULL,
    "point_of_sale_id" TEXT NOT NULL,
    "voucher_type_id" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "voucher_counters_pkey" PRIMARY KEY ("company_id","point_of_sale_id","voucher_type_id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "point_of_sale_id" TEXT NOT NULL,
    "voucher_type_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "party_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchange_rate" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "related_voucher_id" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax_total" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "cae" TEXT,
    "cae_expiration_date" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_line_taxes" (
    "voucher_line_id" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "voucher_line_taxes_pkey" PRIMARY KEY ("voucher_line_id","tax_id")
);

-- CreateIndex
CREATE INDEX "points_of_sale_company_id_idx" ON "points_of_sale"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "points_of_sale_company_id_code_key" ON "points_of_sale"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_types_code_key" ON "voucher_types"("code");

-- CreateIndex
CREATE INDEX "vouchers_company_id_created_at_idx" ON "vouchers"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "vouchers_party_id_idx" ON "vouchers"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_company_id_point_of_sale_id_voucher_type_id_number_key" ON "vouchers"("company_id", "point_of_sale_id", "voucher_type_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_lines_voucher_id_line_number_key" ON "voucher_lines"("voucher_id", "line_number");

-- CreateIndex
CREATE INDEX "stock_movements_voucher_id_idx" ON "stock_movements"("voucher_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_counters" ADD CONSTRAINT "voucher_counters_point_of_sale_id_fkey" FOREIGN KEY ("point_of_sale_id") REFERENCES "points_of_sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_point_of_sale_id_fkey" FOREIGN KEY ("point_of_sale_id") REFERENCES "points_of_sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_voucher_type_id_fkey" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_related_voucher_id_fkey" FOREIGN KEY ("related_voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_line_taxes" ADD CONSTRAINT "voucher_line_taxes_voucher_line_id_fkey" FOREIGN KEY ("voucher_line_id") REFERENCES "voucher_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_line_taxes" ADD CONSTRAINT "voucher_line_taxes_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "taxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint: los totales de un comprobante nunca pueden ser negativos.
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_subtotal_non_negative" CHECK ("subtotal" >= 0);
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tax_total_non_negative" CHECK ("tax_total" >= 0);
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_total_non_negative" CHECK ("total" >= 0);
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_exchange_rate_positive" CHECK ("exchange_rate" > 0);

-- CheckConstraint: cantidad y precio de una línea nunca pueden ser negativos;
-- el descuento es un porcentaje válido (0-100).
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_unit_price_non_negative" CHECK ("unit_price" >= 0);
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_discount_percentage_range" CHECK ("discount_percentage" >= 0 AND "discount_percentage" <= 100);
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_subtotal_non_negative" CHECK ("subtotal" >= 0);

-- CheckConstraint: tasa y monto de impuesto de línea nunca pueden ser negativos.
ALTER TABLE "voucher_line_taxes" ADD CONSTRAINT "voucher_line_taxes_rate_non_negative" CHECK ("rate" >= 0);
ALTER TABLE "voucher_line_taxes" ADD CONSTRAINT "voucher_line_taxes_amount_non_negative" CHECK ("amount" >= 0);
