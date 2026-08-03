-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_company_id_idempotency_key_key" ON "payments"("company_id", "idempotency_key");
