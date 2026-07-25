import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { ListCategoriesUseCaseInput } from '../dto/category.dto';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: ListCategoriesUseCaseInput): Promise<CategoryEntity[]> {
    return this.categoryRepository.findAllByCompany(input.companyId, {
      isActive: input.isActive,
    });
  }
}
