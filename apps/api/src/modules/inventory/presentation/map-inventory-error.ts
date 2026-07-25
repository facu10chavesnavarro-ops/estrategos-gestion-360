import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import {
  WarehouseNotFoundError,
  InvalidWarehouseBranchError,
  DuplicateWarehouseNameError,
  WarehouseAlreadyInTargetStateError,
} from '../domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
  InsufficientStockError,
  MissingReasonError,
  MissingUnitCostError,
  SameWarehouseTransferError,
  InvalidQuantityError,
} from '../domain/errors/stock-movement.errors';

const NOT_FOUND_ERRORS = [WarehouseNotFoundError, ItemNotFoundError];

const BAD_REQUEST_ERRORS = [
  InvalidWarehouseBranchError,
  DuplicateWarehouseNameError,
  WarehouseAlreadyInTargetStateError,
  ItemDoesNotTrackStockError,
  InsufficientStockError,
  MissingReasonError,
  MissingUnitCostError,
  SameWarehouseTransferError,
  InvalidQuantityError,
];

export function mapInventoryError(error: unknown): never {
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
