import { Injectable } from '@nestjs/common';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { ListChartOfAccountsUseCaseInput } from '../dto/chart-of-account.dto';

@Injectable()
export class ListChartOfAccountsUseCase {
  constructor(private readonly chartOfAccountRepository: ChartOfAccountRepository) {}

  async execute(input: ListChartOfAccountsUseCaseInput): Promise<ChartOfAccountEntity[]> {
    return this.chartOfAccountRepository.findAllByCompany(input.companyId, {
      isActive: input.isActive,
    });
  }
}
