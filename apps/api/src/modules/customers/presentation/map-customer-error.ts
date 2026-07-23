import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import {
  InvalidTaxIdError,
  DuplicateCustomerError,
  InvalidCreditLimitError,
  CustomerNotFoundError,
  CustomerAlreadyInTargetStateError,
} from '../domain/errors/customer.errors';

export function mapCustomerError(error: unknown): never {
  if (error instanceof RoleNotAuthorizedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof CustomerNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof InvalidTaxIdError ||
    error instanceof DuplicateCustomerError ||
    error instanceof InvalidCreditLimitError ||
    error instanceof CustomerAlreadyInTargetStateError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
