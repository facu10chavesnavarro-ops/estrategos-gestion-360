import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import {
  ChartOfAccountNotFoundError,
  AccountingSettingsNotFoundError,
  JournalEntryNotFoundError,
  InvalidParentAccountError,
  AccountCycleError,
  DuplicateAccountCodeError,
  ChartOfAccountAlreadyInTargetStateError,
  AccountNotImputableError,
  SystemAccountCannotBeDeactivatedError,
  InvalidAccountMappingError,
  AccountingAlreadyActivatedError,
  UnbalancedJournalEntryError,
  EmptyJournalEntryLinesError,
  JournalEntryAlreadyReversedError,
  InvalidJournalEntryAccountError,
  MissingCategoryAccountMappingError,
  MissingTaxAccountMappingError,
  MissingCashRegisterAccountMappingError,
  MissingBankAccountMappingError,
  MissingPaymentMethodAccountMappingError,
  MissingCounterpartAccountError,
} from '../domain/errors/accounting.errors';
import { InvalidPaymentMethodError } from '../../treasury/domain/errors/payment.errors';

const NOT_FOUND_ERRORS = [
  ChartOfAccountNotFoundError,
  AccountingSettingsNotFoundError,
  JournalEntryNotFoundError,
];

const BAD_REQUEST_ERRORS = [
  InvalidParentAccountError,
  AccountCycleError,
  DuplicateAccountCodeError,
  ChartOfAccountAlreadyInTargetStateError,
  AccountNotImputableError,
  SystemAccountCannotBeDeactivatedError,
  InvalidAccountMappingError,
  AccountingAlreadyActivatedError,
  UnbalancedJournalEntryError,
  EmptyJournalEntryLinesError,
  JournalEntryAlreadyReversedError,
  InvalidJournalEntryAccountError,
  MissingCategoryAccountMappingError,
  MissingTaxAccountMappingError,
  MissingCashRegisterAccountMappingError,
  MissingBankAccountMappingError,
  MissingPaymentMethodAccountMappingError,
  MissingCounterpartAccountError,
  InvalidPaymentMethodError,
];

export function mapAccountingError(error: unknown): never {
  if (error instanceof RoleNotAuthorizedError) {
    throw new ForbiddenException(error.message);
  }
  if (NOT_FOUND_ERRORS.some((ErrorClass) => error instanceof ErrorClass)) {
    throw new NotFoundException((error as Error).message);
  }
  if (BAD_REQUEST_ERRORS.some((ErrorClass) => error instanceof ErrorClass)) {
    throw new BadRequestException((error as Error).message);
  }
  throw error;
}
