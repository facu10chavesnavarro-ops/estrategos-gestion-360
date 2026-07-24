import { Injectable } from '@nestjs/common';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { ChangeSupplierStateUseCaseInput } from '../dto/supplier.dto';
import {
  SupplierNotFoundError,
  SupplierAlreadyInTargetStateError,
} from '../../domain/errors/supplier.errors';

/** RN-TER-03/04/05/12. */
@Injectable()
export class DeactivateSupplierUseCase {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeSupplierStateUseCaseInput): Promise<SupplierEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.supplierRepository.findById(
      input.supplierId,
      input.companyId,
    );
    if (!existing) {
      throw new SupplierNotFoundError();
    }
    if (!existing.isActive) {
      throw new SupplierAlreadyInTargetStateError('inactivo');
    }

    return this.unitOfWork.run(async (ctx) => {
      const supplier = await this.supplierRepository.setActive(
        input.supplierId,
        false,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'supplier.deactivate',
          entityType: 'Supplier',
          entityId: supplier.id,
        },
        ctx,
      );

      return supplier;
    });
  }
}
