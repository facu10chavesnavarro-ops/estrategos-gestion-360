import { Injectable } from '@nestjs/common';
import { PointOfSaleRepository } from '../../domain/repositories/point-of-sale.repository';
import { BranchRepository } from '../../../companies/domain/repositories/branch.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';
import { CreatePointOfSaleUseCaseInput } from '../dto/point-of-sale.dto';
import {
  InvalidPointOfSaleBranchError,
  DuplicatePointOfSaleCodeError,
} from '../../domain/errors/point-of-sale.errors';

/** RN-VOU-01/10/11. */
@Injectable()
export class CreatePointOfSaleUseCase {
  constructor(
    private readonly pointOfSaleRepository: PointOfSaleRepository,
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreatePointOfSaleUseCaseInput): Promise<PointOfSaleEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const branch = await this.branchRepository.findById(input.branchId);
    if (!branch || branch.companyId !== input.companyId) {
      throw new InvalidPointOfSaleBranchError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const duplicate = await this.pointOfSaleRepository.findByCompanyAndCode(
        input.companyId,
        input.code,
        ctx,
      );
      if (duplicate) {
        throw new DuplicatePointOfSaleCodeError();
      }

      const pointOfSale = await this.pointOfSaleRepository.create(
        {
          companyId: input.companyId,
          branchId: input.branchId,
          code: input.code,
          name: input.name,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'point_of_sale.create',
          entityType: 'PointOfSale',
          entityId: pointOfSale.id,
          metadata: {
            code: pointOfSale.code,
            name: pointOfSale.name,
            branchId: pointOfSale.branchId,
          },
        },
        ctx,
      );

      return pointOfSale;
    });
  }
}
