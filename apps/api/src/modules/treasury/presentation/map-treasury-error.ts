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
} from '../domain/errors/payment.errors';

const NOT_FOUND_ERRORS = [PaymentNotFoundError, CustomerNotFoundError, SupplierNotFoundError];

const BAD_REQUEST_ERRORS = [
  InvalidPaymentCounterpartyError,
  EmptyPaymentMethodDetailsError,
  InvalidPaymentMethodError,
  MissingCheckDetailError,
  AllocationExceedsPaymentAmountError,
  InvalidAllocationVoucherError,
  VoucherOverpaidError,
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
