/*
  Warnings:

  - Added the required column `affects_current_account` to the `voucher_types` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CurrentAccountEffect" AS ENUM ('DEBIT', 'CREDIT', 'NONE');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('EN_CARTERA', 'DEPOSITADO', 'RECHAZADO', 'COBRADO');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('COLLECTION', 'PAYMENT');

-- CreateEnum
CREATE TYPE "CurrentAccountMovementType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
-- Se agrega nullable, se completa según flow/is_credit_note de los 7 tipos
-- ya sembrados (docs/sprint-3/04-tesoreria.md §0.1), y recién entonces se
-- fija NOT NULL — evita el error de Prisma al agregar una columna
-- obligatoria sobre una tabla con filas existentes.
ALTER TABLE "voucher_types" ADD COLUMN     "affects_current_account" "CurrentAccountEffect";

UPDATE "voucher_types" SET "affects_current_account" = CASE
  WHEN "flow" = 'SALE' AND "is_credit_note" = false THEN 'DEBIT'
  WHEN "flow" = 'SALE' AND "is_credit_note" = true THEN 'CREDIT'
  WHEN "flow" = 'PURCHASE' AND "is_credit_note" = false THEN 'CREDIT'
  ELSE 'CREDIT'
END::"CurrentAccountEffect";

ALTER TABLE "voucher_types" ALTER COLUMN "affects_current_account" SET NOT NULL;

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requires_check_detail" BOOLEAN NOT NULL DEFAULT false,
    "requires_card_detail" BOOLEAN NOT NULL DEFAULT false,
    "requires_cash_movement" BOOLEAN NOT NULL DEFAULT false,
    "requires_bank_movement" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_details" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'EN_CARTERA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_details" (
    "id" TEXT NOT NULL,
    "authorization_code" TEXT,
    "batch_number" TEXT,
    "settlement_entity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchange_rate" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "amount_applied" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_details" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT,
    "check_detail_id" TEXT,
    "card_detail_id" TEXT,

    CONSTRAINT "payment_method_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_account_movements" (
    "id" TEXT NOT NULL,
    "customer_account_id" TEXT NOT NULL,
    "type" "CurrentAccountMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "voucher_id" TEXT,
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "supplier_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_account_movements" (
    "id" TEXT NOT NULL,
    "supplier_account_id" TEXT NOT NULL,
    "type" "CurrentAccountMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "voucher_id" TEXT,
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- CreateIndex
CREATE INDEX "payments_company_id_created_at_idx" ON "payments"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_party_id_idx" ON "payments"("party_id");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_voucher_id_idx" ON "payment_allocations"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_details_check_detail_id_key" ON "payment_method_details"("check_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_details_card_detail_id_key" ON "payment_method_details"("card_detail_id");

-- CreateIndex
CREATE INDEX "payment_method_details_payment_id_idx" ON "payment_method_details"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_customer_id_key" ON "customer_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_account_movements_customer_account_id_created_at_idx" ON "customer_account_movements"("customer_account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_accounts_supplier_id_key" ON "supplier_accounts"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_account_movements_supplier_account_id_created_at_idx" ON "supplier_account_movements"("supplier_account_id", "created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_details" ADD CONSTRAINT "payment_method_details_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_details" ADD CONSTRAINT "payment_method_details_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_details" ADD CONSTRAINT "payment_method_details_check_detail_id_fkey" FOREIGN KEY ("check_detail_id") REFERENCES "check_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_details" ADD CONSTRAINT "payment_method_details_card_detail_id_fkey" FOREIGN KEY ("card_detail_id") REFERENCES "card_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_customer_account_id_fkey" FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_accounts" ADD CONSTRAINT "supplier_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_accounts" ADD CONSTRAINT "supplier_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_account_movements" ADD CONSTRAINT "supplier_account_movements_supplier_account_id_fkey" FOREIGN KEY ("supplier_account_id") REFERENCES "supplier_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_account_movements" ADD CONSTRAINT "supplier_account_movements_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint (agregados a mano, Prisma no los expresa en el schema)
ALTER TABLE "payments" ADD CONSTRAINT "payments_total_amount_positive" CHECK ("total_amount" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_exchange_rate_positive" CHECK ("exchange_rate" > 0);
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_amount_applied_positive" CHECK ("amount_applied" > 0);
ALTER TABLE "payment_method_details" ADD CONSTRAINT "payment_method_details_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "customer_account_movements" ADD CONSTRAINT "customer_account_movements_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "supplier_account_movements" ADD CONSTRAINT "supplier_account_movements_amount_positive" CHECK ("amount" > 0);
