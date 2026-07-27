/*
  Warnings:

  - The primary key for the `company_payment_method_accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `direction` to the `company_payment_method_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "company_payment_method_accounts" DROP CONSTRAINT "company_payment_method_accounts_pkey",
ADD COLUMN     "direction" "PaymentDirection" NOT NULL,
ADD CONSTRAINT "company_payment_method_accounts_pkey" PRIMARY KEY ("company_id", "payment_method_id", "direction");
