import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer.errors';
import { SupplierNotFoundError } from '../../suppliers/domain/errors/supplier.errors';
import {
  PaymentNotFoundError,
  InvalidPaymentCounterpartyError,
  EmptyPaymentMethodDetailsError,
  InvalidPaymentMethodError,
  MissingCheckDetailError,
  AllocationExceedsPaymentAmountError,
  InvalidAllocationVoucherError,
  VoucherOverpaidError,
  MissingCashSessionError,
  InvalidCashSessionError,
  MissingBankAccountError,
  InvalidBankAccountError,
} from '../domain/errors/payment.errors';
import {
  CashRegisterNotFoundError,
  InvalidCashRegisterBranchError,
  CashRegisterAlreadyInTargetStateError,
  CashSessionNotFoundError,
  CashRegisterAlreadyHasOpenSessionError,
  InvalidOpeningBalanceError,
  CashSessionAlreadyClosedError,
  MissingCashMovementReasonError,
  CashSessionNotOpenError,
  InvalidCashMovementAmountError,
} from '../domain/errors/cash.errors';
import {
  BankAccountNotFoundError,
  BankAccountAlreadyInTargetStateError,
  MissingBankMovementDescriptionError,
  InvalidBankMovementAmountError,
} from '../domain/errors/bank.errors';

const NOT_FOUND_ERRORS = [
  PaymentNotFoundError,
  CustomerNotFoundError,
  SupplierNotFoundError,
  CashRegisterNotFoundError,
  CashSessionNotFoundError,
  BankAccountNotFoundError,
];

const BAD_REQUEST_ERRORS = [
  InvalidPaymentCounterpartyError,
  EmptyPaymentMethodDetailsError,
  InvalidPaymentMethodError,
  MissingCheckDetailError,
  AllocationExceedsPaymentAmountError,
  InvalidAllocationVoucherError,
  VoucherOverpaidError,
  MissingCashSessionError,
  InvalidCashSessionError,
  MissingBankAccountError,
  InvalidBankAccountError,
  InvalidCashRegisterBranchError,
  CashRegisterAlreadyInTargetStateError,
  CashRegisterAlreadyHasOpenSessionError,
  InvalidOpeningBalanceError,
  CashSessionAlreadyClosedError,
  MissingCashMovementReasonError,
  CashSessionNotOpenError,
  InvalidCashMovementAmountError,
  BankAccountAlreadyInTargetStateError,
  MissingBankMovementDescriptionError,
  InvalidBankMovementAmountError,
];

export function mapTreasuryError(error: unknown): never {
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
