import { Injectable } from '@nestjs/common';
import { ItemRepository } from '../../domain/repositories/item.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ItemEntity } from '../../domain/entities/item.entity';
import { ChangeItemStateUseCaseInput } from '../dto/item.dto';
import { ItemNotFoundError, ItemAlreadyInTargetStateError } from '../../domain/errors/item.errors';

/** RN-CAT-14/15/16. */
@Injectable()
export class ActivateItemUseCase {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeItemStateUseCaseInput): Promise<ItemEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.itemRepository.findById(input.itemId, input.companyId);
    if (!existing) {
      throw new ItemNotFoundError();
    }
    if (existing.isActive) {
      throw new ItemAlreadyInTargetStateError('activo');
    }

    return this.unitOfWork.run(async (ctx) => {
      const item = await this.itemRepository.setActive(input.itemId, true, ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'item.activate',
          entityType: 'Item',
          entityId: item.id,
        },
        ctx,
      );

      return item;
    });
  }
}
