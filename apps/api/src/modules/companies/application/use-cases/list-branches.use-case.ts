import { Injectable } from '@nestjs/common';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { BranchEntity } from '../../domain/entities/branch.entity';

@Injectable()
export class ListBranchesUseCase {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(companyId: string): Promise<BranchEntity[]> {
    return this.branchRepository.findAllByCompany(companyId);
  }
}
