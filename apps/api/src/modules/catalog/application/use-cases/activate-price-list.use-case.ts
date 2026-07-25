import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PriceListEntity } from '../../domain/entities/price-list.entity';
import { ChangePriceListStateUseCaseInput } from '../dto/price-list.dto';
import {
  PriceListNotFoundError,
  PriceListAlreadyInTargetStateError,
} from '../../domain/errors/price-list.errors';

/** RN-CAT-14/15/16. */
@Injectable()
export class ActivatePriceListUseCase {
  constructor(
    private readonly priceListRepository: PriceListRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangePriceListStateUseCaseInput): Promise<PriceListEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.priceListRepository.findById(
      input.priceListId,
      input.companyId,
    );
    if (!existing) {
      throw new PriceListNotFoundError();
    }
    if (existing.isActive) {
      throw new PriceListAlreadyInTargetStateError('activa');
    }

    return this.unitOfWork.run(async (ctx) => {
      const priceList = await this.priceListRepository.setActive(
        input.priceListId,
        true,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'price-list.activate',
          entityType: 'PriceList',
          entityId: priceList.id,
        },
        ctx,
      );

      return priceList;
    });
  }
}
