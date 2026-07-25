import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { ChangeCategoryStateUseCaseInput } from '../dto/category.dto';
import {
  CategoryNotFoundError,
  CategoryAlreadyInTargetStateError,
} from '../../domain/errors/category.errors';

/** RN-CAT-14/15/16. */
@Injectable()
export class ActivateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeCategoryStateUseCaseInput): Promise<CategoryEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.categoryRepository.findById(input.categoryId, input.companyId);
    if (!existing) {
      throw new CategoryNotFoundError();
    }
    if (existing.isActive) {
      throw new CategoryAlreadyInTargetStateError('activa');
    }

    return this.unitOfWork.run(async (ctx) => {
      const category = await this.categoryRepository.setActive(input.categoryId, true, ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'category.activate',
          entityType: 'Category',
          entityId: category.id,
        },
        ctx,
      );

      return category;
    });
  }
}
