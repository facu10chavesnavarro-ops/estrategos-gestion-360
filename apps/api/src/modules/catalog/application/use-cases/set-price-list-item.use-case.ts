import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { ItemRepository } from '../../domain/repositories/item.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PriceListItemEntity } from '../../domain/entities/price-list.entity';
import { SetPriceListItemUseCaseInput } from '../dto/price-list.dto';
import { PriceListNotFoundError, InvalidPriceError } from '../../domain/errors/price-list.errors';
import { ItemNotFoundError } from '../../domain/errors/item.errors';

/** RN-CAT-01/12/14/15: upsert del precio de un Item en una PriceList. */
@Injectable()
export class SetPriceListItemUseCase {
  constructor(
    private readonly priceListRepository: PriceListRepository,
    private readonly itemRepository: ItemRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: SetPriceListItemUseCaseInput): Promise<PriceListItemEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (Number(input.price) < 0) {
      throw new InvalidPriceError();
    }

    const priceList = await this.priceListRepository.findById(
      input.priceListId,
      input.companyId,
    );
    if (!priceList) {
      throw new PriceListNotFoundError();
    }
    const item = await this.itemRepository.findById(input.itemId, input.companyId);
    if (!item) {
      throw new ItemNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const priceListItem = await this.priceListRepository.upsertItem(
        input.priceListId,
        input.itemId,
        input.price,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'price-list-item.set',
          entityType: 'PriceListItem',
          entityId: `${input.priceListId}:${input.itemId}`,
          metadata: { priceListId: input.priceListId, itemId: input.itemId, price: input.price },
        },
        ctx,
      );

      return priceListItem;
    });
  }
}
