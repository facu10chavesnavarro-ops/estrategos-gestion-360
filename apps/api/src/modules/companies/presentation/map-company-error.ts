import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidTaxIdError,
  CompanyNotFoundError,
  BranchNotFoundError,
  AlreadyInTargetStateError,
} from '../domain/errors/company.errors';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';

/** Traduce errores de dominio del módulo a excepciones HTTP de Nest. */
export function mapCompanyError(error: unknown): never {
  if (error instanceof RoleNotAuthorizedError) {
    throw new ForbiddenException(error.message);
  }
  if (
    error instanceof CompanyNotFoundError ||
    error instanceof BranchNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof InvalidTaxIdError ||
    error instanceof AlreadyInTargetStateError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
