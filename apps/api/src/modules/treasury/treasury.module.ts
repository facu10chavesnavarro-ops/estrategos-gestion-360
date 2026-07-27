import { Module } from '@nestjs/common';
import { PaymentMethodsController } from './presentation/controllers/payment-methods.controller';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { CustomerCurrentAccountController } from './presentation/controllers/customer-current-account.controller';
import { SupplierCurrentAccountController } from './presentation/controllers/supplier-current-account.controller';
import { CashRegistersController } from './presentation/controllers/cash-registers.controller';
import { CashSessionsController } from './presentation/controllers/cash-sessions.controller';
import { BankAccountsController } from './presentation/controllers/bank-accounts.controller';

import { ListPaymentMethodsUseCase } from './application/use-cases/list-payment-methods.use-case';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';
import { GetPaymentByIdUseCase } from './application/use-cases/get-payment-by-id.use-case';
import { GetCustomerCurrentAccountUseCase } from './application/use-cases/get-customer-current-account.use-case';
import { GetSupplierCurrentAccountUseCase } from './application/use-cases/get-supplier-current-account.use-case';
import { CreateCashRegisterUseCase } from './application/use-cases/create-cash-register.use-case';
import { UpdateCashRegisterUseCase } from './application/use-cases/update-cash-register.use-case';
import { GetCashRegisterByIdUseCase } from './application/use-cases/get-cash-register-by-id.use-case';
import { ListCashRegistersUseCase } from './application/use-cases/list-cash-registers.use-case';
import { DeactivateCashRegisterUseCase } from './application/use-cases/deactivate-cash-register.use-case';
import { ActivateCashRegisterUseCase } from './application/use-cases/activate-cash-register.use-case';
import { OpenCashSessionUseCase } from './application/use-cases/open-cash-session.use-case';
import { CloseCashSessionUseCase } from './application/use-cases/close-cash-session.use-case';
import { ListCashSessionsUseCase } from './application/use-cases/list-cash-sessions.use-case';
import { CreateCashMovementUseCase } from './application/use-cases/create-cash-movement.use-case';
import { ListCashMovementsUseCase } from './application/use-cases/list-cash-movements.use-case';
import { CreateBankAccountUseCase } from './application/use-cases/create-bank-account.use-case';
import { UpdateBankAccountUseCase } from './application/use-cases/update-bank-account.use-case';
import { GetBankAccountByIdUseCase } from './application/use-cases/get-bank-account-by-id.use-case';
import { ListBankAccountsUseCase } from './application/use-cases/list-bank-accounts.use-case';
import { DeactivateBankAccountUseCase } from './application/use-cases/deactivate-bank-account.use-case';
import { ActivateBankAccountUseCase } from './application/use-cases/activate-bank-account.use-case';
import { CreateBankMovementUseCase } from './application/use-cases/create-bank-movement.use-case';
import { ListBankMovementsUseCase } from './application/use-cases/list-bank-movements.use-case';
import { ApplyCustomerAccountMovementService } from './application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from './application/services/apply-supplier-account-movement.service';
import { ApplyCashMovementService } from './application/services/apply-cash-movement.service';
import { ApplyBankMovementService } from './application/services/apply-bank-movement.service';

import { PaymentMethodRepository } from './domain/repositories/payment-method.repository';
import { PrismaPaymentMethodRepository } from './infrastructure/persistence/prisma-payment-method.repository';
import { PaymentRepository } from './domain/repositories/payment.repository';
import { PrismaPaymentRepository } from './infrastructure/persistence/prisma-payment.repository';
import { CustomerAccountRepository, CustomerAccountMovementRepository } from './domain/repositories/customer-account.repository';
import {
  PrismaCustomerAccountRepository,
  PrismaCustomerAccountMovementRepository,
} from './infrastructure/persistence/prisma-customer-account.repository';
import { SupplierAccountRepository, SupplierAccountMovementRepository } from './domain/repositories/supplier-account.repository';
import {
  PrismaSupplierAccountRepository,
  PrismaSupplierAccountMovementRepository,
} from './infrastructure/persistence/prisma-supplier-account.repository';
import { CashRegisterRepository } from './domain/repositories/cash-register.repository';
import { PrismaCashRegisterRepository } from './infrastructure/persistence/prisma-cash-register.repository';
import { CashSessionRepository } from './domain/repositories/cash-session.repository';
import { PrismaCashSessionRepository } from './infrastructure/persistence/prisma-cash-session.repository';
import { CashMovementRepository } from './domain/repositories/cash-movement.repository';
import { PrismaCashMovementRepository } from './infrastructure/persistence/prisma-cash-movement.repository';
import { BankAccountRepository } from './domain/repositories/bank-account.repository';
import { PrismaBankAccountRepository } from './infrastructure/persistence/prisma-bank-account.repository';
import { BankMovementRepository } from './domain/repositories/bank-movement.repository';
import { PrismaBankMovementRepository } from './infrastructure/persistence/prisma-bank-movement.repository';

import { CustomerRepository } from '../customers/domain/repositories/customer.repository';
import { PrismaCustomerRepository } from '../customers/infrastructure/persistence/prisma-customer.repository';
import { SupplierRepository } from '../suppliers/domain/repositories/supplier.repository';
import { PrismaSupplierRepository } from '../suppliers/infrastructure/persistence/prisma-supplier.repository';
import { VoucherRepository } from '../vouchers/domain/repositories/voucher.repository';
import { PrismaVoucherRepository } from '../vouchers/infrastructure/persistence/prisma-voucher.repository';
import { CompanyRepository } from '../companies/domain/repositories/company.repository';
import { PrismaCompanyRepository } from '../companies/infrastructure/persistence/prisma-company.repository';
import { BranchRepository } from '../companies/domain/repositories/branch.repository';
import { PrismaBranchRepository } from '../companies/infrastructure/persistence/prisma-branch.repository';

import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { UnitOfWork } from '../../common/domain/transaction/unit-of-work.port';
import { PrismaUnitOfWork } from '../../common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [
    PaymentMethodsController,
    PaymentsController,
    CustomerCurrentAccountController,
    SupplierCurrentAccountController,
    CashRegistersController,
    CashSessionsController,
    BankAccountsController,
  ],
  providers: [
    PrismaService,
    ListPaymentMethodsUseCase,
    CreatePaymentUseCase,
    ListPaymentsUseCase,
    GetPaymentByIdUseCase,
    GetCustomerCurrentAccountUseCase,
    GetSupplierCurrentAccountUseCase,
    CreateCashRegisterUseCase,
    UpdateCashRegisterUseCase,
    GetCashRegisterByIdUseCase,
    ListCashRegistersUseCase,
    DeactivateCashRegisterUseCase,
    ActivateCashRegisterUseCase,
    OpenCashSessionUseCase,
    CloseCashSessionUseCase,
    ListCashSessionsUseCase,
    CreateCashMovementUseCase,
    ListCashMovementsUseCase,
    CreateBankAccountUseCase,
    UpdateBankAccountUseCase,
    GetBankAccountByIdUseCase,
    ListBankAccountsUseCase,
    DeactivateBankAccountUseCase,
    ActivateBankAccountUseCase,
    CreateBankMovementUseCase,
    ListBankMovementsUseCase,
    ApplyCustomerAccountMovementService,
    ApplySupplierAccountMovementService,
    ApplyCashMovementService,
    ApplyBankMovementService,
    { provide: PaymentMethodRepository, useClass: PrismaPaymentMethodRepository },
    { provide: PaymentRepository, useClass: PrismaPaymentRepository },
    { provide: CustomerAccountRepository, useClass: PrismaCustomerAccountRepository },
    { provide: CustomerAccountMovementRepository, useClass: PrismaCustomerAccountMovementRepository },
    { provide: SupplierAccountRepository, useClass: PrismaSupplierAccountRepository },
    { provide: SupplierAccountMovementRepository, useClass: PrismaSupplierAccountMovementRepository },
    { provide: CashRegisterRepository, useClass: PrismaCashRegisterRepository },
    { provide: CashSessionRepository, useClass: PrismaCashSessionRepository },
    { provide: CashMovementRepository, useClass: PrismaCashMovementRepository },
    { provide: BankAccountRepository, useClass: PrismaBankAccountRepository },
    { provide: BankMovementRepository, useClass: PrismaBankMovementRepository },
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: SupplierRepository, useClass: PrismaSupplierRepository },
    { provide: VoucherRepository, useClass: PrismaVoucherRepository },
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: BranchRepository, useClass: PrismaBranchRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
})
export class TreasuryModule {}
