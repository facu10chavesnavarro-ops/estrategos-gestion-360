import { Injectable } from '@nestjs/common';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { ChartOfAccountNotFoundError } from '../../domain/errors/accounting.errors';

@Injectable()
export class GetChartOfAccountByIdUseCase {
  constructor(private readonly chartOfAccountRepository: ChartOfAccountRepository) {}

  async execute(accountId: string, companyId: string): Promise<ChartOfAccountEntity> {
    const account = await this.chartOfAccountRepository.findById(accountId, companyId);
    if (!account) {
      throw new ChartOfAccountNotFoundError();
    }
    return account;
  }
}
