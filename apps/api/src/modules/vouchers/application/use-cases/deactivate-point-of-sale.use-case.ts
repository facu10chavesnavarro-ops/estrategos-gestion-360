import { Injectable } from '@nestjs/common';
import { PointOfSaleRepository } from '../../domain/repositories/point-of-sale.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';
import { ChangePointOfSaleStateUseCaseInput } from '../dto/point-of-sale.dto';
import {
  PointOfSaleNotFoundError,
  PointOfSaleAlreadyInTargetStateError,
} from '../../domain/errors/point-of-sale.errors';

/** RN-VOU-10/11. */
@Injectable()
export class DeactivatePointOfSaleUseCase {
  constructor(
    private readonly pointOfSaleRepository: PointOfSaleRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangePointOfSaleStateUseCaseInput): Promise<PointOfSaleEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.pointOfSaleRepository.findById(
      input.pointOfSaleId,
      input.companyId,
    );
    if (!existing) {
      throw new PointOfSaleNotFoundError();
    }
    if (!existing.isActive) {
      throw new PointOfSaleAlreadyInTargetStateError('inactivo');
    }

    return this.unitOfWork.run(async (ctx) => {
      const pointOfSale = await this.pointOfSaleRepository.setActive(
        input.pointOfSaleId,
        false,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'point_of_sale.deactivate',
          entityType: 'PointOfSale',
          entityId: pointOfSale.id,
        },
        ctx,
      );

      return pointOfSale;
    });
  }
}
