import { Module } from '@nestjs/common';
import { PointsOfSaleController } from './presentation/controllers/points-of-sale.controller';
import { VoucherTypesController } from './presentation/controllers/voucher-types.controller';
import { VouchersController } from './presentation/controllers/vouchers.controller';

import { CreatePointOfSaleUseCase } from './application/use-cases/create-point-of-sale.use-case';
import { UpdatePointOfSaleUseCase } from './application/use-cases/update-point-of-sale.use-case';
import { GetPointOfSaleByIdUseCase } from './application/use-cases/get-point-of-sale-by-id.use-case';
import { ListPointsOfSaleUseCase } from './application/use-cases/list-points-of-sale.use-case';
import { DeactivatePointOfSaleUseCase } from './application/use-cases/deactivate-point-of-sale.use-case';
import { ActivatePointOfSaleUseCase } from './application/use-cases/activate-point-of-sale.use-case';
import { ListVoucherTypesUseCase } from './application/use-cases/list-voucher-types.use-case';
import { CreateVoucherUseCase } from './application/use-cases/create-voucher.use-case';
import { ListVouchersUseCase } from './application/use-cases/list-vouchers.use-case';
import { GetVoucherByIdUseCase } from './application/use-cases/get-voucher-by-id.use-case';

import { PointOfSaleRepository } from './domain/repositories/point-of-sale.repository';
import { PrismaPointOfSaleRepository } from './infrastructure/persistence/prisma-point-of-sale.repository';
import { VoucherTypeRepository } from './domain/repositories/voucher-type.repository';
import { PrismaVoucherTypeRepository } from './infrastructure/persistence/prisma-voucher-type.repository';
import { VoucherCounterRepository } from './domain/repositories/voucher-counter.repository';
import { PrismaVoucherCounterRepository } from './infrastructure/persistence/prisma-voucher-counter.repository';
import { VoucherRepository } from './domain/repositories/voucher.repository';
import { PrismaVoucherRepository } from './infrastructure/persistence/prisma-voucher.repository';

import { BranchRepository } from '../companies/domain/repositories/branch.repository';
import { PrismaBranchRepository } from '../companies/infrastructure/persistence/prisma-branch.repository';
import { CompanyRepository } from '../companies/domain/repositories/company.repository';
import { PrismaCompanyRepository } from '../companies/infrastructure/persistence/prisma-company.repository';
import { CustomerRepository } from '../customers/domain/repositories/customer.repository';
import { PrismaCustomerRepository } from '../customers/infrastructure/persistence/prisma-customer.repository';
import { SupplierRepository } from '../suppliers/domain/repositories/supplier.repository';
import { PrismaSupplierRepository } from '../suppliers/infrastructure/persistence/prisma-supplier.repository';
import { ItemRepository } from '../catalog/domain/repositories/item.repository';
import { PrismaItemRepository } from '../catalog/infrastructure/persistence/prisma-item.repository';
import { TaxRepository } from '../catalog/domain/repositories/tax.repository';
import { PrismaTaxRepository } from '../catalog/infrastructure/persistence/prisma-tax.repository';
import { CategoryRepository } from '../catalog/domain/repositories/category.repository';
import { PrismaCategoryRepository } from '../catalog/infrastructure/persistence/prisma-category.repository';
import { WarehouseRepository } from '../inventory/domain/repositories/warehouse.repository';
import { PrismaWarehouseRepository } from '../inventory/infrastructure/persistence/prisma-warehouse.repository';
import { StockRepository } from '../inventory/domain/repositories/stock.repository';
import { PrismaStockRepository } from '../inventory/infrastructure/persistence/prisma-stock.repository';
import { StockMovementRepository } from '../inventory/domain/repositories/stock-movement.repository';
import { PrismaStockMovementRepository } from '../inventory/infrastructure/persistence/prisma-stock-movement.repository';
import { ApplyStockMovementService } from '../inventory/application/services/apply-stock-movement.service';

import { CustomerAccountRepository, CustomerAccountMovementRepository } from '../treasury/domain/repositories/customer-account.repository';
import {
  PrismaCustomerAccountRepository,
  PrismaCustomerAccountMovementRepository,
} from '../treasury/infrastructure/persistence/prisma-customer-account.repository';
import { SupplierAccountRepository, SupplierAccountMovementRepository } from '../treasury/domain/repositories/supplier-account.repository';
import {
  PrismaSupplierAccountRepository,
  PrismaSupplierAccountMovementRepository,
} from '../treasury/infrastructure/persistence/prisma-supplier-account.repository';
import { ApplyCustomerAccountMovementService } from '../treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../treasury/application/services/apply-supplier-account-movement.service';

import { ChartOfAccountRepository } from '../accounting/domain/repositories/chart-of-account.repository';
import { PrismaChartOfAccountRepository } from '../accounting/infrastructure/persistence/prisma-chart-of-account.repository';
import { AccountingSettingsRepository } from '../accounting/domain/repositories/accounting-settings.repository';
import { PrismaAccountingSettingsRepository } from '../accounting/infrastructure/persistence/prisma-accounting-settings.repository';
import { JournalEntryRepository } from '../accounting/domain/repositories/journal-entry.repository';
import { PrismaJournalEntryRepository } from '../accounting/infrastructure/persistence/prisma-journal-entry.repository';
import { ApplyJournalEntryService } from '../accounting/application/services/apply-journal-entry.service';

import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { UnitOfWork } from '../../common/domain/transaction/unit-of-work.port';
import { PrismaUnitOfWork } from '../../common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [PointsOfSaleController, VoucherTypesController, VouchersController],
  providers: [
    PrismaService,
    CreatePointOfSaleUseCase,
    UpdatePointOfSaleUseCase,
    GetPointOfSaleByIdUseCase,
    ListPointsOfSaleUseCase,
    DeactivatePointOfSaleUseCase,
    ActivatePointOfSaleUseCase,
    ListVoucherTypesUseCase,
    CreateVoucherUseCase,
    ListVouchersUseCase,
    GetVoucherByIdUseCase,
    ApplyStockMovementService,
    ApplyCustomerAccountMovementService,
    ApplySupplierAccountMovementService,
    ApplyJournalEntryService,
    { provide: PointOfSaleRepository, useClass: PrismaPointOfSaleRepository },
    { provide: VoucherTypeRepository, useClass: PrismaVoucherTypeRepository },
    { provide: VoucherCounterRepository, useClass: PrismaVoucherCounterRepository },
    { provide: VoucherRepository, useClass: PrismaVoucherRepository },
    { provide: BranchRepository, useClass: PrismaBranchRepository },
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: SupplierRepository, useClass: PrismaSupplierRepository },
    { provide: ItemRepository, useClass: PrismaItemRepository },
    { provide: TaxRepository, useClass: PrismaTaxRepository },
    { provide: CategoryRepository, useClass: PrismaCategoryRepository },
    { provide: ChartOfAccountRepository, useClass: PrismaChartOfAccountRepository },
    { provide: AccountingSettingsRepository, useClass: PrismaAccountingSettingsRepository },
    { provide: JournalEntryRepository, useClass: PrismaJournalEntryRepository },
    { provide: WarehouseRepository, useClass: PrismaWarehouseRepository },
    { provide: StockRepository, useClass: PrismaStockRepository },
    { provide: StockMovementRepository, useClass: PrismaStockMovementRepository },
    { provide: CustomerAccountRepository, useClass: PrismaCustomerAccountRepository },
    { provide: CustomerAccountMovementRepository, useClass: PrismaCustomerAccountMovementRepository },
    { provide: SupplierAccountRepository, useClass: PrismaSupplierAccountRepository },
    { provide: SupplierAccountMovementRepository, useClass: PrismaSupplierAccountMovementRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
})
export class VouchersModule {}
