import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { RemovePriceListItemUseCaseInput } from '../dto/price-list.dto';
import {
  PriceListNotFoundError,
  ItemNotInPriceListError,
} from '../../domain/errors/price-list.errors';

/** RN-CAT-04 (excepción): PriceListItem admite baja física. */
@Injectable()
export class RemovePriceListItemUseCase {
  constructor(
    private readonly priceListRepository: PriceListRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: RemovePriceListItemUseCaseInput): Promise<void> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const priceList = await this.priceListRepository.findById(
      input.priceListId,
      input.companyId,
    );
    if (!priceList) {
      throw new PriceListNotFoundError();
    }
    const existing = await this.priceListRepository.findItem(input.priceListId, input.itemId);
    if (!existing) {
      throw new ItemNotInPriceListError();
    }

    await this.unitOfWork.run(async (ctx) => {
      await this.priceListRepository.removeItem(input.priceListId, input.itemId, ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'price-list-item.remove',
          entityType: 'PriceListItem',
          entityId: `${input.priceListId}:${input.itemId}`,
        },
        ctx,
      );
    });
  }
}
