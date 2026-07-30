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
import { UpdateItemUseCaseInput } from '../dto/item.dto';
import {
  ItemNotFoundError,
  DuplicateSkuError,
  MinimumStockWithoutTrackingError,
  InvalidItemCategoryError,
  InvalidItemTaxError,
  InvalidCostPriceError,
  DuplicateBarcodeError,
} from '../../domain/errors/item.errors';

/** RN-CAT-01/02/05/06/07/08/11/14/15. */
@Injectable()
export class UpdateItemUseCase {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly taxRepository: TaxRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateItemUseCaseInput): Promise<ItemEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.itemRepository.findById(input.itemId, input.companyId);
    if (!existing) {
      throw new ItemNotFoundError();
    }

    // RN-CAT-07: un Servicio nunca controla stock.
    const tracksStock =
      existing.type === 'SERVICE' ? false : (input.tracksStock ?? existing.tracksStock);
    const minimumStock = input.minimumStock === undefined ? undefined : input.minimumStock;
    const effectiveMinimumStock =
      minimumStock !== undefined ? minimumStock : existing.minimumStock;
    if (effectiveMinimumStock !== null && !tracksStock) {
      throw new MinimumStockWithoutTrackingError();
    }

    if (input.costPrice != null && Number(input.costPrice) < 0) {
      throw new InvalidCostPriceError();
    }

    return this.unitOfWork.run(async (ctx) => {
      if (input.sku && input.sku !== existing.sku) {
        const duplicate = await this.itemRepository.findBySku(input.companyId, input.sku, ctx);
        if (duplicate) {
          throw new DuplicateSkuError();
        }
      }
      if (input.barcode && input.barcode !== existing.barcode) {
        const duplicateBarcode = await this.itemRepository.findByBarcode(
          input.companyId,
          input.barcode,
          ctx,
        );
        if (duplicateBarcode) {
          throw new DuplicateBarcodeError();
        }
      }
      if (input.categoryId) {
        await this.assertCategoryBelongsToCompany(input.categoryId, input.companyId, ctx);
      }
      if (input.taxIds && input.taxIds.length > 0) {
        await this.assertTaxesBelongToCompany(input.taxIds, input.companyId, ctx);
      }

      const {
        requestingUserId,
        requestingRoleName: _role,
        companyId,
        itemId,
        ...patch
      } = input;

      const item = await this.itemRepository.update(
        itemId,
        { ...patch, tracksStock },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId,
          userId: requestingUserId,
          action: 'item.update',
          entityType: 'Item',
          entityId: item.id,
          metadata: { fields: Object.keys(patch) },
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
