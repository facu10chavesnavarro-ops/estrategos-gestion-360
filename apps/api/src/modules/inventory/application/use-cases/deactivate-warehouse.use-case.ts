import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';
import { ChangeWarehouseStateUseCaseInput } from '../dto/warehouse.dto';
import {
  WarehouseNotFoundError,
  WarehouseAlreadyInTargetStateError,
} from '../../domain/errors/warehouse.errors';

/** RN-STK-03/10/11/12. */
@Injectable()
export class DeactivateWarehouseUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeWarehouseStateUseCaseInput): Promise<WarehouseEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.warehouseRepository.findById(
      input.warehouseId,
      input.companyId,
    );
    if (!existing) {
      throw new WarehouseNotFoundError();
    }
    if (!existing.isActive) {
      throw new WarehouseAlreadyInTargetStateError('inactivo');
    }

    return this.unitOfWork.run(async (ctx) => {
      const warehouse = await this.warehouseRepository.setActive(
        input.warehouseId,
        false,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'warehouse.deactivate',
          entityType: 'Warehouse',
          entityId: warehouse.id,
        },
        ctx,
      );

      return warehouse;
    });
  }
}
