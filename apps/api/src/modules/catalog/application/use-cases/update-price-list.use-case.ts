import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PriceListEntity } from '../../domain/entities/price-list.entity';
import { UpdatePriceListUseCaseInput } from '../dto/price-list.dto';
import { PriceListNotFoundError } from '../../domain/errors/price-list.errors';

/** RN-CAT-01/13/14/15. */
@Injectable()
export class UpdatePriceListUseCase {
  constructor(
    private readonly priceListRepository: PriceListRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdatePriceListUseCaseInput): Promise<PriceListEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.priceListRepository.findById(
      input.priceListId,
      input.companyId,
    );
    if (!existing) {
      throw new PriceListNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      if (input.isDefault) {
        await this.priceListRepository.clearDefaultForCompany(
          input.companyId,
          input.priceListId,
          ctx,
        );
      }

      const {
        requestingUserId,
        requestingRoleName: _role,
        companyId,
        priceListId,
        validFrom,
        validTo,
        ...rest
      } = input;

      const priceList = await this.priceListRepository.update(
        priceListId,
        {
          ...rest,
          validFrom: validFrom ? new Date(validFrom) : undefined,
          validTo: validTo === null ? null : validTo ? new Date(validTo) : undefined,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId,
          userId: requestingUserId,
          action: 'price-list.update',
          entityType: 'PriceList',
          entityId: priceList.id,
          metadata: { fields: Object.keys(rest) },
        },
        ctx,
      );

      return priceList;
    });
  }
}
