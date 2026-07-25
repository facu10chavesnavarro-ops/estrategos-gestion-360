import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';
import { UpdateWarehouseUseCaseInput } from '../dto/warehouse.dto';
import {
  WarehouseNotFoundError,
  DuplicateWarehouseNameError,
} from '../../domain/errors/warehouse.errors';

/** RN-STK-01/02/10/11. */
@Injectable()
export class UpdateWarehouseUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateWarehouseUseCaseInput): Promise<WarehouseEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.warehouseRepository.findById(
      input.warehouseId,
      input.companyId,
    );
    if (!existing) {
      throw new WarehouseNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      if (input.name && input.name !== existing.name) {
        const duplicate = await this.warehouseRepository.findByBranchAndName(
          existing.branchId,
          input.name,
          ctx,
        );
        if (duplicate) {
          throw new DuplicateWarehouseNameError();
        }
      }

      const warehouse = await this.warehouseRepository.update(
        input.warehouseId,
        { name: input.name },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'warehouse.update',
          entityType: 'Warehouse',
          entityId: warehouse.id,
          metadata: { fields: ['name'] },
        },
        ctx,
      );

      return warehouse;
    });
  }
}
