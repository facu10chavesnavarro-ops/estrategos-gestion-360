import { CurrentAccountMovementType } from './customer-account.entity';

export class SupplierAccountEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly supplierId: string,
    public readonly currentBalance: string,
  ) {}
}

/** RN-CTA-02/03: análogo a CustomerAccountMovementEntity. */
export class SupplierAccountMovementEntity {
  constructor(
    public readonly id: string,
    public readonly supplierAccountId: string,
    public readonly type: CurrentAccountMovementType,
    public readonly amount: string,
    public readonly balanceAfter: string,
    public readonly voucherId: string | null,
    public readonly paymentId: string | null,
    public readonly createdAt: Date,
  ) {}
}
