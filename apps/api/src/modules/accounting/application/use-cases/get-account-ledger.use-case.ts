import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { JournalEntryRepository, AccountLedgerMovement } from '../../domain/repositories/journal-entry.repository';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { GetAccountLedgerUseCaseInput } from '../dto/journal-entry.dto';
import { ChartOfAccountNotFoundError } from '../../domain/errors/accounting.errors';

export interface AccountLedgerMovementWithBalance extends AccountLedgerMovement {
  runningBalance: string;
}

export interface AccountLedgerResult {
  account: ChartOfAccountEntity;
  movements: AccountLedgerMovementWithBalance[];
}

/**
 * Libro Mayor (§5). El saldo acumulado suma en el sentido "natural" de la
 * cuenta: Activo/Egreso crece con el Debe, Pasivo/Patrimonio Neto/Ingreso
 * crece con el Haber.
 */
@Injectable()
export class GetAccountLedgerUseCase {
  constructor(
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  async execute(input: GetAccountLedgerUseCaseInput): Promise<AccountLedgerResult> {
    const account = await this.chartOfAccountRepository.findById(input.accountId, input.companyId);
    if (!account) {
      throw new ChartOfAccountNotFoundError();
    }

    const movements = await this.journalEntryRepository.findLedgerByAccount(
      input.accountId,
      input.companyId,
    );

    const growsWithDebit = account.type === 'ASSET' || account.type === 'EXPENSE';
    let balance = new Decimal(0);
    const movementsWithBalance = movements.map((movement) => {
      const delta = growsWithDebit
        ? new Decimal(movement.debit).minus(movement.credit)
        : new Decimal(movement.credit).minus(movement.debit);
      balance = balance.plus(delta);
      return { ...movement, runningBalance: balance.toFixed(2) };
    });

    return { account, movements: movementsWithBalance };
  }
}
