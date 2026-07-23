import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import {
  InvalidTaxIdError,
  DuplicateSupplierError,
  SupplierNotFoundError,
  SupplierAlreadyInTargetStateError,
} from '../domain/errors/supplier.errors';

export function mapSupplierError(error: unknown): never {
  if (error instanceof RoleNotAuthorizedError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof SupplierNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof InvalidTaxIdError ||
    error instanceof DuplicateSupplierError ||
    error instanceof SupplierAlreadyInTargetStateError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
