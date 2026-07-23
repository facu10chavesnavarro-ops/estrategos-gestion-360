-- CreateIndex
CREATE INDEX "branches_company_id_is_active_idx" ON "branches"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "company_users_company_id_is_active_idx" ON "company_users"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "customers_company_id_is_active_idx" ON "customers"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "suppliers_company_id_is_active_idx" ON "suppliers"("company_id", "is_active");
