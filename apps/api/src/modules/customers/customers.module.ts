import { Module } from '@nestjs/common';
import { CustomersController } from './presentation/controllers/customers.controller';

import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case';
import { GetCustomerByIdUseCase } from './application/use-cases/get-customer-by-id.use-case';
import { ListCustomersUseCase } from './application/use-cases/list-customers.use-case';
import { DeactivateCustomerUseCase } from './application/use-cases/deactivate-customer.use-case';
import { ActivateCustomerUseCase } from './application/use-cases/activate-customer.use-case';
import { ImportCustomersUseCase } from './application/use-cases/import-customers.use-case';
import { CustomerImportRowProcessor } from './application/customer-import-row-processor';

import { CustomerRepository } from './domain/repositories/customer.repository';
import { PrismaCustomerRepository } from './infrastructure/persistence/prisma-customer.repository';

import { PartyRepository } from '../parties/domain/repositories/party.repository';
import { PrismaPartyRepository } from '../parties/infrastructure/persistence/prisma-party.repository';

import { CsvImportEngine } from '../../common/application/csv-import.engine';
import { CsvParserPort } from '../../common/domain/import/csv-parser.port';
import { CsvParseAdapter } from '../../common/infrastructure/csv-parse-adapter';
import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [CustomersController],
  providers: [
    PrismaService,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    GetCustomerByIdUseCase,
    ListCustomersUseCase,
    DeactivateCustomerUseCase,
    ActivateCustomerUseCase,
    ImportCustomersUseCase,
    CustomerImportRowProcessor,
    CsvImportEngine,
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: PartyRepository, useClass: PrismaPartyRepository },
    { provide: CsvParserPort, useClass: CsvParseAdapter },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
  ],
})
export class CustomersModule {}
