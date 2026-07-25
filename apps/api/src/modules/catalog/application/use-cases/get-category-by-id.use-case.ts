import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CategoryNotFoundError } from '../../domain/errors/category.errors';

@Injectable()
export class GetCategoryByIdUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(categoryId: string, companyId: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findById(categoryId, companyId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
    return category;
  }
}
