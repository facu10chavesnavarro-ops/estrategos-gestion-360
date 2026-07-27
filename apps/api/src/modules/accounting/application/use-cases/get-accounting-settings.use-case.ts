import { Injectable } from '@nestjs/common';
import { AccountingSettingsRepository } from '../../domain/repositories/accounting-settings.repository';
import { AccountingSettingsEntity } from '../../domain/entities/accounting-settings.entity';
import { AccountingSettingsNotFoundError } from '../../domain/errors/accounting.errors';

@Injectable()
export class GetAccountingSettingsUseCase {
  constructor(private readonly accountingSettingsRepository: AccountingSettingsRepository) {}

  async execute(companyId: string): Promise<AccountingSettingsEntity> {
    const settings = await this.accountingSettingsRepository.findByCompany(companyId);
    if (!settings) {
      throw new AccountingSettingsNotFoundError();
    }
    return settings;
  }
}
