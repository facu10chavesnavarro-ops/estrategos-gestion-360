import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { UpdateCategoryUseCaseInput } from '../dto/category.dto';
import {
  CategoryNotFoundError,
  InvalidParentCategoryError,
  CategoryCycleError,
} from '../../domain/errors/category.errors';

const MAX_DEPTH = 100;

/** RN-CAT-01/02/03/14/15. */
@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateCategoryUseCaseInput): Promise<CategoryEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.categoryRepository.findById(input.categoryId, input.companyId);
    if (!existing) {
      throw new CategoryNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      if (input.parentId) {
        await this.assertValidNewParent(input.categoryId, input.parentId, input.companyId, ctx);
      }

      const { requestingUserId, requestingRoleName: _role, companyId, categoryId, ...patch } =
        input;

      const category = await this.categoryRepository.update(categoryId, patch, ctx);

      await this.auditLogRepository.record(
        {
          companyId,
          userId: requestingUserId,
          action: 'category.update',
          entityType: 'Category',
          entityId: category.id,
          metadata: { fields: Object.keys(patch) },
        },
        ctx,
      );

      return category;
    });
  }

  /** RN-CAT-02: misma empresa. RN-CAT-03: sin ciclos en la jerarquía. */
  private async assertValidNewParent(
    categoryId: string,
    newParentId: string,
    companyId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    if (newParentId === categoryId) {
      throw new CategoryCycleError();
    }

    let current = await this.categoryRepository.findById(newParentId, companyId, ctx);
    if (!current) {
      throw new InvalidParentCategoryError();
    }

    for (let depth = 0; depth < MAX_DEPTH && current.parentId; depth++) {
      if (current.parentId === categoryId) {
        throw new CategoryCycleError();
      }
      current = await this.categoryRepository.findById(current.parentId, companyId, ctx);
      if (!current) break;
    }
  }
}
