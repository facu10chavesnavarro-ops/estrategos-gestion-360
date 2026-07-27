import { Module } from '@nestjs/common';
import { CategoriesController } from './presentation/controllers/categories.controller';
import { ItemsController } from './presentation/controllers/items.controller';
import { TaxesController } from './presentation/controllers/taxes.controller';
import { PriceListsController } from './presentation/controllers/price-lists.controller';

import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { GetCategoryByIdUseCase } from './application/use-cases/get-category-by-id.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { DeactivateCategoryUseCase } from './application/use-cases/deactivate-category.use-case';
import { ActivateCategoryUseCase } from './application/use-cases/activate-category.use-case';

import { CreateItemUseCase } from './application/use-cases/create-item.use-case';
import { UpdateItemUseCase } from './application/use-cases/update-item.use-case';
import { GetItemByIdUseCase } from './application/use-cases/get-item-by-id.use-case';
import { ListItemsUseCase } from './application/use-cases/list-items.use-case';
import { DeactivateItemUseCase } from './application/use-cases/deactivate-item.use-case';
import { ActivateItemUseCase } from './application/use-cases/activate-item.use-case';

import { CreateTaxUseCase } from './application/use-cases/create-tax.use-case';
import { UpdateTaxUseCase } from './application/use-cases/update-tax.use-case';
import { CloseTaxUseCase } from './application/use-cases/close-tax.use-case';
import { ListTaxesUseCase } from './application/use-cases/list-taxes.use-case';

import { CreatePriceListUseCase } from './application/use-cases/create-price-list.use-case';
import { UpdatePriceListUseCase } from './application/use-cases/update-price-list.use-case';
import { ListPriceListsUseCase } from './application/use-cases/list-price-lists.use-case';
import { DeactivatePriceListUseCase } from './application/use-cases/deactivate-price-list.use-case';
import { ActivatePriceListUseCase } from './application/use-cases/activate-price-list.use-case';
import { ListPriceListItemsUseCase } from './application/use-cases/list-price-list-items.use-case';
import { SetPriceListItemUseCase } from './application/use-cases/set-price-list-item.use-case';
import { RemovePriceListItemUseCase } from './application/use-cases/remove-price-list-item.use-case';

import { CategoryRepository } from './domain/repositories/category.repository';
import { PrismaCategoryRepository } from './infrastructure/persistence/prisma-category.repository';
import { ItemRepository } from './domain/repositories/item.repository';
import { PrismaItemRepository } from './infrastructure/persistence/prisma-item.repository';
import { TaxRepository } from './domain/repositories/tax.repository';
import { PrismaTaxRepository } from './infrastructure/persistence/prisma-tax.repository';
import { PriceListRepository } from './domain/repositories/price-list.repository';
import { PrismaPriceListRepository } from './infrastructure/persistence/prisma-price-list.repository';

import { ChartOfAccountRepository } from '../accounting/domain/repositories/chart-of-account.repository';
import { PrismaChartOfAccountRepository } from '../accounting/infrastructure/persistence/prisma-chart-of-account.repository';

import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { UnitOfWork } from '../../common/domain/transaction/unit-of-work.port';
import { PrismaUnitOfWork } from '../../common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [CategoriesController, ItemsController, TaxesController, PriceListsController],
  providers: [
    PrismaService,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    GetCategoryByIdUseCase,
    ListCategoriesUseCase,
    DeactivateCategoryUseCase,
    ActivateCategoryUseCase,
    CreateItemUseCase,
    UpdateItemUseCase,
    GetItemByIdUseCase,
    ListItemsUseCase,
    DeactivateItemUseCase,
    ActivateItemUseCase,
    CreateTaxUseCase,
    UpdateTaxUseCase,
    CloseTaxUseCase,
    ListTaxesUseCase,
    CreatePriceListUseCase,
    UpdatePriceListUseCase,
    ListPriceListsUseCase,
    DeactivatePriceListUseCase,
    ActivatePriceListUseCase,
    ListPriceListItemsUseCase,
    SetPriceListItemUseCase,
    RemovePriceListItemUseCase,
    { provide: CategoryRepository, useClass: PrismaCategoryRepository },
    { provide: ItemRepository, useClass: PrismaItemRepository },
    { provide: TaxRepository, useClass: PrismaTaxRepository },
    { provide: PriceListRepository, useClass: PrismaPriceListRepository },
    { provide: ChartOfAccountRepository, useClass: PrismaChartOfAccountRepository },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
})
export class CatalogModule {}
