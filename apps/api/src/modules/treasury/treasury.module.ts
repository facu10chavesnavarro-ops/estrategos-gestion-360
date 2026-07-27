import { Module } from '@nestjs/common';
import { PaymentMethodsController } from './presentation/controllers/payment-methods.controller';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { CustomerCurrentAccountController } from './presentation/controllers/customer-current-account.controller';
import { SupplierCurrentAccountController } from './presentation/controllers/supplier-current-account.controller';

import { ListPaymentMethodsUseCase } from './application/use-cases/list-payment-methods.use-case';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { ListPaymentsUseCase } from './application/use-cases/list-payments.use-case';
import { GetPaymentByIdUseCase } from './application/use-cases/get-payment-by-id.use-case';
import { GetCustomerCurrentAccountUseCase } from './application/use-cases/get-customer-current-account.use-case';
import { GetSupplierCurrentAccountUseCase } from './application/use-cases/get-supplier-current-account.use-case';
import { ApplyCustomerAccountMovementService } from './application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from './application/services/apply-supplier-account-movement.service';

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

import { CustomerRepository } from '../customers/domain/repositories/customer.repository';
import { PrismaCustomerRepository } from '../customers/infrastructure/persistence/prisma-customer.repository';
import { SupplierRepository } from '../suppliers/domain/repositories/supplier.repository';
import { PrismaSupplierRepository } from '../suppliers/infrastructure/persistence/prisma-supplier.repository';
import { VoucherRepository } from '../vouchers/domain/repositories/voucher.repository';
import { PrismaVoucherRepository } from '../vouchers/infrastructure/persistence/prisma-voucher.repository';
import { CompanyRepository } from '../companies/domain/repositories/company.repository';
import { PrismaCompanyRepository } from '../companies/infrastructure/persistence/prisma-company.repository';

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
  ],
  providers: [
    PrismaService,
    ListPaymentMethodsUseCase,
    CreatePaymentUseCase,
    ListPaymentsUseCase,
    GetPaymentByIdUseCase,
    GetCustomerCurrentAccountUseCase,
    GetSupplierCurrentAccountUseCase,
    ApplyCustomerAccountMovementService,
    ApplySupplierAccountMovementService,
    { provide: PaymentMethodRepository, useClass: PrismaPaymentMethodRepository },
    { provide: PaymentRepository, useClass: PrismaPaymentRepository },
    { provide: CustomerAccountRepository, useClass: PrismaCustomerAccountRepository },
    { provide: CustomerAccountMovementRepository, useClass: PrismaCustomerAccountMovementRepository },
    { provide: SupplierAccountRepository, useClass: PrismaSupplierAccountRepository },
    { provide: SupplierAccountMovementRepository, useClass: PrismaSupplierAccountMovementRepository },
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: SupplierRepository, useClass: PrismaSupplierRepository },
    { provide: VoucherRepository, useClass: PrismaVoucherRepository },
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
})
export class TreasuryModule {}
