import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PriceListEntity } from '../../domain/entities/price-list.entity';
import { CreatePriceListUseCaseInput } from '../dto/price-list.dto';

/** RN-CAT-01/13/14/15. */
@Injectable()
export class CreatePriceListUseCase {
  constructor(
    private readonly priceListRepository: PriceListRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreatePriceListUseCaseInput): Promise<PriceListEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    return this.unitOfWork.run(async (ctx) => {
      if (input.isDefault) {
        // RN-CAT-13: a lo sumo una PriceList default por empresa.
        await this.priceListRepository.clearDefaultForCompany(input.companyId, undefined, ctx);
      }

      const priceList = await this.priceListRepository.create(
        {
          companyId: input.companyId,
          name: input.name,
          currency: input.currency,
          isDefault: input.isDefault ?? false,
          validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
          validTo: input.validTo ? new Date(input.validTo) : undefined,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'price-list.create',
          entityType: 'PriceList',
          entityId: priceList.id,
          metadata: { name: priceList.name, isDefault: priceList.isDefault },
        },
        ctx,
      );

      return priceList;
    });
  }
}
