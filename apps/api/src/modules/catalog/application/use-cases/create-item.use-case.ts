import { Injectable } from '@nestjs/common';
import { ItemRepository } from '../../domain/repositories/item.repository';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { TaxRepository } from '../../domain/repositories/tax.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ItemEntity } from '../../domain/entities/item.entity';
import { CreateItemUseCaseInput } from '../dto/item.dto';
import {
  DuplicateSkuError,
  MinimumStockWithoutTrackingError,
  InvalidItemCategoryError,
  InvalidItemTaxError,
} from '../../domain/errors/item.errors';

/** RN-CAT-01/02/05/06/07/08/11/14/15. */
@Injectable()
export class CreateItemUseCase {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly taxRepository: TaxRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateItemUseCaseInput): Promise<ItemEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    // RN-CAT-07: un Servicio nunca controla stock, sin importar lo enviado.
    const tracksStock = input.type === 'SERVICE' ? false : (input.tracksStock ?? false);

    // RN-CAT-08: minimumStock solo tiene sentido si tracksStock = true.
    if (input.minimumStock !== undefined && !tracksStock) {
      throw new MinimumStockWithoutTrackingError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const existing = await this.itemRepository.findBySku(input.companyId, input.sku, ctx);
      if (existing) {
        throw new DuplicateSkuError();
      }

      if (input.categoryId) {
        await this.assertCategoryBelongsToCompany(input.categoryId, input.companyId, ctx);
      }
      const taxIds = input.taxIds ?? [];
      if (taxIds.length > 0) {
        await this.assertTaxesBelongToCompany(taxIds, input.companyId, ctx);
      }

      const item = await this.itemRepository.create(
        {
          companyId: input.companyId,
          type: input.type,
          sku: input.sku,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          unitOfMeasure: input.unitOfMeasure,
          tracksStock,
          minimumStock: input.minimumStock,
          taxIds,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'item.create',
          entityType: 'Item',
          entityId: item.id,
          metadata: { sku: item.sku, name: item.name, type: item.type },
        },
        ctx,
      );

      return item;
    });
  }

  private async assertCategoryBelongsToCompany(
    categoryId: string,
    companyId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId, companyId, ctx);
    if (!category) {
      throw new InvalidItemCategoryError();
    }
  }

  private async assertTaxesBelongToCompany(
    taxIds: string[],
    companyId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    for (const taxId of taxIds) {
      const tax = await this.taxRepository.findById(taxId, companyId, ctx);
      if (!tax) {
        throw new InvalidItemTaxError();
      }
    }
  }
}
