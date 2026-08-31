import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import { ImportTooManyRowsError } from '../../../common/domain/errors/import.errors';
import {
  CategoryNotFoundError,
  InvalidParentCategoryError,
  CategoryCycleError,
  CategoryAlreadyInTargetStateError,
} from '../domain/errors/category.errors';
import {
  ItemNotFoundError,
  DuplicateSkuError,
  MinimumStockWithoutTrackingError,
  InvalidItemCategoryError,
  InvalidItemTaxError,
  ItemAlreadyInTargetStateError,
  InvalidCostPriceError,
  DuplicateBarcodeError,
} from '../domain/errors/item.errors';
import {
  TaxNotFoundError,
  InvalidTaxRateError,
  InvalidTaxValidityError,
  TaxAlreadyClosedError,
} from '../domain/errors/tax.errors';
import {
  PriceListNotFoundError,
  PriceListAlreadyInTargetStateError,
  InvalidPriceError,
  ItemNotInPriceListError,
} from '../domain/errors/price-list.errors';
import { InvalidAccountMappingError } from '../../accounting/domain/errors/accounting.errors';

const NOT_FOUND_ERRORS = [
  CategoryNotFoundError,
  ItemNotFoundError,
  TaxNotFoundError,
  PriceListNotFoundError,
  ItemNotInPriceListError,
];

const BAD_REQUEST_ERRORS = [
  InvalidParentCategoryError,
  CategoryCycleError,
  CategoryAlreadyInTargetStateError,
  DuplicateSkuError,
  MinimumStockWithoutTrackingError,
  InvalidItemCategoryError,
  InvalidItemTaxError,
  ItemAlreadyInTargetStateError,
  InvalidCostPriceError,
  DuplicateBarcodeError,
  InvalidTaxRateError,
  InvalidTaxValidityError,
  TaxAlreadyClosedError,
  PriceListAlreadyInTargetStateError,
  InvalidPriceError,
  InvalidAccountMappingError,
  ImportTooManyRowsError,
];

export function mapCatalogError(error: unknown): never {
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
