import { Module } from '@nestjs/common';
import { WarehousesController } from './presentation/controllers/warehouses.controller';
import { StockController } from './presentation/controllers/stock.controller';
import { StockTransfersController } from './presentation/controllers/stock-transfers.controller';

import { CreateWarehouseUseCase } from './application/use-cases/create-warehouse.use-case';
import { UpdateWarehouseUseCase } from './application/use-cases/update-warehouse.use-case';
import { GetWarehouseByIdUseCase } from './application/use-cases/get-warehouse-by-id.use-case';
import { ListWarehousesUseCase } from './application/use-cases/list-warehouses.use-case';
import { DeactivateWarehouseUseCase } from './application/use-cases/deactivate-warehouse.use-case';
import { ActivateWarehouseUseCase } from './application/use-cases/activate-warehouse.use-case';
import { ListStockUseCase } from './application/use-cases/list-stock.use-case';
import { ListStockMovementsUseCase } from './application/use-cases/list-stock-movements.use-case';
import { CreateStockAdjustmentUseCase } from './application/use-cases/create-stock-adjustment.use-case';
import { CreateStockTransferUseCase } from './application/use-cases/create-stock-transfer.use-case';
import { ApplyStockMovementService } from './application/services/apply-stock-movement.service';

import { WarehouseRepository } from './domain/repositories/warehouse.repository';
import { PrismaWarehouseRepository } from './infrastructure/persistence/prisma-warehouse.repository';
import { StockRepository } from './domain/repositories/stock.repository';
import { PrismaStockRepository } from './infrastructure/persistence/prisma-stock.repository';
import { StockMovementRepository } from './domain/repositories/stock-movement.repository';
import { PrismaStockMovementRepository } from './infrastructure/persistence/prisma-stock-movement.repository';

import { BranchRepository } from '../companies/domain/repositories/branch.repository';
import { PrismaBranchRepository } from '../companies/infrastructure/persistence/prisma-branch.repository';
import { CompanyRepository } from '../companies/domain/repositories/company.repository';
import { PrismaCompanyRepository } from '../companies/infrastructure/persistence/prisma-company.repository';
import { ItemRepository } from '../catalog/domain/repositories/item.repository';
import { PrismaItemRepository } from '../catalog/infrastructure/persistence/prisma-item.repository';

import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { UnitOfWork } from '../../common/domain/transaction/unit-of-work.port';
import { PrismaUnitOfWork } from '../../common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [WarehousesController, StockController, StockTransfersController],
  providers: [
    PrismaService,
    CreateWarehouseUseCase,
    UpdateWarehouseUseCase,
    GetWarehouseByIdUseCase,
    ListWarehousesUseCase,
    DeactivateWarehouseUseCase,
    ActivateWarehouseUseCase,
    ListStockUseCase,
    ListStockMovementsUseCase,
    CreateStockAdjustmentUseCase,
    CreateStockTransferUseCase,
    ApplyStockMovementService,
    { provide: WarehouseRepository, useClass: PrismaWarehouseRepository },
    { provide: StockRepository, useClass: PrismaStockRepository },
    { provide: StockMovementRepository, useClass: PrismaStockMovementRepository },
    { provide: BranchRepository, useClass: PrismaBranchRepository },
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: ItemRepository, useClass: PrismaItemRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
})
export class InventoryModule {}
