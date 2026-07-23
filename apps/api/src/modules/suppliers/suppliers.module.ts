import { Module } from '@nestjs/common';
import { SuppliersController } from './presentation/controllers/suppliers.controller';

import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { GetSupplierByIdUseCase } from './application/use-cases/get-supplier-by-id.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { DeactivateSupplierUseCase } from './application/use-cases/deactivate-supplier.use-case';
import { ActivateSupplierUseCase } from './application/use-cases/activate-supplier.use-case';
import { ImportSuppliersUseCase } from './application/use-cases/import-suppliers.use-case';
import { SupplierImportRowProcessor } from './application/supplier-import-row-processor';

import { SupplierRepository } from './domain/repositories/supplier.repository';
import { PrismaSupplierRepository } from './infrastructure/persistence/prisma-supplier.repository';

import { PartyRepository } from '../parties/domain/repositories/party.repository';
import { PrismaPartyRepository } from '../parties/infrastructure/persistence/prisma-party.repository';

import { CsvImportEngine } from '../../common/application/csv-import.engine';
import { CsvParserPort } from '../../common/domain/import/csv-parser.port';
import { CsvParseAdapter } from '../../common/infrastructure/csv-parse-adapter';
import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [SuppliersController],
  providers: [
    PrismaService,
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    GetSupplierByIdUseCase,
    ListSuppliersUseCase,
    DeactivateSupplierUseCase,
    ActivateSupplierUseCase,
    ImportSuppliersUseCase,
    SupplierImportRowProcessor,
    CsvImportEngine,
    { provide: SupplierRepository, useClass: PrismaSupplierRepository },
    { provide: PartyRepository, useClass: PrismaPartyRepository },
    { provide: CsvParserPort, useClass: CsvParseAdapter },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
  ],
})
export class SuppliersModule {}
