import { CustomerAccountMovementEntity } from '../../domain/entities/customer-account.entity';
import { SupplierAccountMovementEntity } from '../../domain/entities/supplier-account.entity';

export interface CustomerCurrentAccountView {
  customerId: string;
  currentBalance: string;
  movements: CustomerAccountMovementEntity[];
}

export interface SupplierCurrentAccountView {
  supplierId: string;
  currentBalance: string;
  movements: SupplierAccountMovementEntity[];
}
