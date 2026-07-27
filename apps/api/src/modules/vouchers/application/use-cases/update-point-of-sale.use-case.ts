import { Injectable } from '@nestjs/common';
import { PointOfSaleRepository } from '../../domain/repositories/point-of-sale.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';
import { UpdatePointOfSaleUseCaseInput } from '../dto/point-of-sale.dto';
import { PointOfSaleNotFoundError } from '../../domain/errors/point-of-sale.errors';

/** RN-VOU-10/11. El `code` es inmutable (identificador fiscal AFIP) — solo se actualiza `name`. */
@Injectable()
export class UpdatePointOfSaleUseCase {
  constructor(
    private readonly pointOfSaleRepository: PointOfSaleRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdatePointOfSaleUseCaseInput): Promise<PointOfSaleEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.pointOfSaleRepository.findById(
      input.pointOfSaleId,
      input.companyId,
    );
    if (!existing) {
      throw new PointOfSaleNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const pointOfSale = await this.pointOfSaleRepository.update(
        input.pointOfSaleId,
        { name: input.name },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'point_of_sale.update',
          entityType: 'PointOfSale',
          entityId: pointOfSale.id,
          metadata: { fields: ['name'] },
        },
        ctx,
      );

      return pointOfSale;
    });
  }
}
