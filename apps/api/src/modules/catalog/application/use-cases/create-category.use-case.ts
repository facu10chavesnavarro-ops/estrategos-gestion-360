import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CreateCategoryUseCaseInput } from '../dto/category.dto';
import { InvalidParentCategoryError } from '../../domain/errors/category.errors';

/** RN-CAT-01/02/14/15. */
@Injectable()
export class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateCategoryUseCaseInput): Promise<CategoryEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    return this.unitOfWork.run(async (ctx) => {
      if (input.parentId) {
        const parent = await this.categoryRepository.findById(
          input.parentId,
          input.companyId,
          ctx,
        );
        if (!parent) {
          throw new InvalidParentCategoryError();
        }
      }

      const category = await this.categoryRepository.create(
        {
          companyId: input.companyId,
          parentId: input.parentId,
          name: input.name,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'category.create',
          entityType: 'Category',
          entityId: category.id,
          metadata: { name: category.name },
        },
        ctx,
      );

      return category;
    });
  }
}
