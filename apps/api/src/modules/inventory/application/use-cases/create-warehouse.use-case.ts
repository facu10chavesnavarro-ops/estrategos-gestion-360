import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { BranchRepository } from '../../../companies/domain/repositories/branch.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';
import { CreateWarehouseUseCaseInput } from '../dto/warehouse.dto';
import {
  InvalidWarehouseBranchError,
  DuplicateWarehouseNameError,
} from '../../domain/errors/warehouse.errors';

/** RN-STK-01/02/10/11. */
@Injectable()
export class CreateWarehouseUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateWarehouseUseCaseInput): Promise<WarehouseEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const branch = await this.branchRepository.findById(input.branchId);
    if (!branch || branch.companyId !== input.companyId) {
      throw new InvalidWarehouseBranchError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const duplicate = await this.warehouseRepository.findByBranchAndName(
        input.branchId,
        input.name,
        ctx,
      );
      if (duplicate) {
        throw new DuplicateWarehouseNameError();
      }

      const warehouse = await this.warehouseRepository.create(
        {
          companyId: input.companyId,
          branchId: input.branchId,
          name: input.name,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'warehouse.create',
          entityType: 'Warehouse',
          entityId: warehouse.id,
          metadata: { name: warehouse.name, branchId: warehouse.branchId },
        },
        ctx,
      );

      return warehouse;
    });
  }
}
