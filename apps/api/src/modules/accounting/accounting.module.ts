import { Module } from '@nestjs/common';
import { ChartOfAccountsController } from './presentation/controllers/chart-of-accounts.controller';
import { AccountingSettingsController } from './presentation/controllers/accounting-settings.controller';
import { JournalEntriesController } from './presentation/controllers/journal-entries.controller';

import { CreateChartOfAccountUseCase } from './application/use-cases/create-chart-of-account.use-case';
import { UpdateChartOfAccountUseCase } from './application/use-cases/update-chart-of-account.use-case';
import { GetChartOfAccountByIdUseCase } from './application/use-cases/get-chart-of-account-by-id.use-case';
import { ListChartOfAccountsUseCase } from './application/use-cases/list-chart-of-accounts.use-case';
import { DeactivateChartOfAccountUseCase } from './application/use-cases/deactivate-chart-of-account.use-case';
import { ActivateChartOfAccountUseCase } from './application/use-cases/activate-chart-of-account.use-case';
import { GetAccountLedgerUseCase } from './application/use-cases/get-account-ledger.use-case';
import { ActivateAccountingUseCase } from './application/use-cases/activate-accounting.use-case';
import { GetAccountingSettingsUseCase } from './application/use-cases/get-accounting-settings.use-case';
import { UpdateAccountingSettingsUseCase } from './application/use-cases/update-accounting-settings.use-case';
import { SetPaymentMethodAccountMappingUseCase } from './application/use-cases/set-payment-method-account-mapping.use-case';
import { ListPaymentMethodAccountMappingsUseCase } from './application/use-cases/list-payment-method-account-mappings.use-case';
import { CreateManualJournalEntryUseCase } from './application/use-cases/create-manual-journal-entry.use-case';
import { ListJournalEntriesUseCase } from './application/use-cases/list-journal-entries.use-case';
import { GetJournalEntryByIdUseCase } from './application/use-cases/get-journal-entry-by-id.use-case';
import { ReverseJournalEntryUseCase } from './application/use-cases/reverse-journal-entry.use-case';
import { ApplyJournalEntryService } from './application/services/apply-journal-entry.service';

import { ChartOfAccountRepository } from './domain/repositories/chart-of-account.repository';
import { PrismaChartOfAccountRepository } from './infrastructure/persistence/prisma-chart-of-account.repository';
import { AccountingSettingsRepository } from './domain/repositories/accounting-settings.repository';
import { PrismaAccountingSettingsRepository } from './infrastructure/persistence/prisma-accounting-settings.repository';
import { JournalEntryRepository } from './domain/repositories/journal-entry.repository';
import { PrismaJournalEntryRepository } from './infrastructure/persistence/prisma-journal-entry.repository';
import { CompanyPaymentMethodAccountRepository } from './domain/repositories/company-payment-method-account.repository';
import { PrismaCompanyPaymentMethodAccountRepository } from './infrastructure/persistence/prisma-company-payment-method-account.repository';

import { PaymentMethodRepository } from '../treasury/domain/repositories/payment-method.repository';
import { PrismaPaymentMethodRepository } from '../treasury/infrastructure/persistence/prisma-payment-method.repository';
import { CompanyRepository } from '../companies/domain/repositories/company.repository';
import { PrismaCompanyRepository } from '../companies/infrastructure/persistence/prisma-company.repository';

import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { UnitOfWork } from '../../common/domain/transaction/unit-of-work.port';
import { PrismaUnitOfWork } from '../../common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [ChartOfAccountsController, AccountingSettingsController, JournalEntriesController],
  providers: [
    PrismaService,
    CreateChartOfAccountUseCase,
    UpdateChartOfAccountUseCase,
    GetChartOfAccountByIdUseCase,
    ListChartOfAccountsUseCase,
    DeactivateChartOfAccountUseCase,
    ActivateChartOfAccountUseCase,
    GetAccountLedgerUseCase,
    ActivateAccountingUseCase,
    GetAccountingSettingsUseCase,
    UpdateAccountingSettingsUseCase,
    SetPaymentMethodAccountMappingUseCase,
    ListPaymentMethodAccountMappingsUseCase,
    CreateManualJournalEntryUseCase,
    ListJournalEntriesUseCase,
    GetJournalEntryByIdUseCase,
    ReverseJournalEntryUseCase,
    ApplyJournalEntryService,
    { provide: ChartOfAccountRepository, useClass: PrismaChartOfAccountRepository },
    { provide: AccountingSettingsRepository, useClass: PrismaAccountingSettingsRepository },
    { provide: JournalEntryRepository, useClass: PrismaJournalEntryRepository },
    {
      provide: CompanyPaymentMethodAccountRepository,
      useClass: PrismaCompanyPaymentMethodAccountRepository,
    },
    { provide: PaymentMethodRepository, useClass: PrismaPaymentMethodRepository },
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
  exports: [
    ChartOfAccountRepository,
    AccountingSettingsRepository,
    JournalEntryRepository,
    CompanyPaymentMethodAccountRepository,
    ApplyJournalEntryService,
  ],
})
export class AccountingModule {}
