import { Module } from '@nestjs/common';
import { CompaniesController } from './presentation/controllers/companies.controller';
import { BranchesController } from './presentation/controllers/branches.controller';

import { ListMyCompaniesUseCase } from './application/use-cases/list-my-companies.use-case';
import { CreateCompanyUseCase } from './application/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from './application/use-cases/update-company.use-case';
import { GetCompanyByIdUseCase } from './application/use-cases/get-company-by-id.use-case';
import { DeactivateCompanyUseCase } from './application/use-cases/deactivate-company.use-case';
import { ActivateCompanyUseCase } from './application/use-cases/activate-company.use-case';
import { CreateBranchUseCase } from './application/use-cases/create-branch.use-case';
import { UpdateBranchUseCase } from './application/use-cases/update-branch.use-case';
import { ListBranchesUseCase } from './application/use-cases/list-branches.use-case';
import { DeactivateBranchUseCase } from './application/use-cases/deactivate-branch.use-case';
import { ActivateBranchUseCase } from './application/use-cases/activate-branch.use-case';

import { CompanyRepository } from './domain/repositories/company.repository';
import { PrismaCompanyRepository } from './infrastructure/persistence/prisma-company.repository';
import { BranchRepository } from './domain/repositories/branch.repository';
import { PrismaBranchRepository } from './infrastructure/persistence/prisma-branch.repository';
import { CompanyUserRepository } from './domain/repositories/company-user.repository';
import { PrismaCompanyUserRepository } from './infrastructure/persistence/prisma-company-user.repository';
import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';

import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [CompaniesController, BranchesController],
  providers: [
    PrismaService,
    ListMyCompaniesUseCase,
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    GetCompanyByIdUseCase,
    DeactivateCompanyUseCase,
    ActivateCompanyUseCase,
    CreateBranchUseCase,
    UpdateBranchUseCase,
    ListBranchesUseCase,
    DeactivateBranchUseCase,
    ActivateBranchUseCase,
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: BranchRepository, useClass: PrismaBranchRepository },
    { provide: CompanyUserRepository, useClass: PrismaCompanyUserRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
  ],
})
export class CompaniesModule {}
