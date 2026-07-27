import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import {
  PointOfSaleNotFoundError,
  InvalidPointOfSaleBranchError,
  DuplicatePointOfSaleCodeError,
  PointOfSaleAlreadyInTargetStateError,
} from '../domain/errors/point-of-sale.errors';
import {
  VoucherNotFoundError,
  VoucherTypeNotFoundError,
  InvalidVoucherPointOfSaleError,
  InvalidCounterpartyError,
  MissingRelatedVoucherError,
  InvalidRelatedVoucherError,
  MissingWarehouseError,
  EmptyVoucherLinesError,
  InvalidVoucherLineItemError,
  InvalidVoucherLineQuantityError,
} from '../domain/errors/voucher.errors';
import { InsufficientStockError } from '../../inventory/domain/errors/stock-movement.errors';

const NOT_FOUND_ERRORS = [
  PointOfSaleNotFoundError,
  VoucherNotFoundError,
  VoucherTypeNotFoundError,
];

const BAD_REQUEST_ERRORS = [
  InvalidPointOfSaleBranchError,
  DuplicatePointOfSaleCodeError,
  PointOfSaleAlreadyInTargetStateError,
  InvalidVoucherPointOfSaleError,
  InvalidCounterpartyError,
  MissingRelatedVoucherError,
  InvalidRelatedVoucherError,
  MissingWarehouseError,
  EmptyVoucherLinesError,
  InvalidVoucherLineItemError,
  InvalidVoucherLineQuantityError,
  InsufficientStockError,
];

export function mapVoucherError(error: unknown): never {
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
