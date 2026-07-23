import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoleNotAuthorizedError } from '../../../common/domain/errors/authorization.error';
import {
  InvitationNotFoundError,
  InvitationNotAcceptableError,
  InvitationNotPendingError,
  DuplicateActiveMembershipError,
  DuplicatePendingInvitationError,
  MemberNotFoundError,
  CannotModifySelfError,
  MemberAlreadyInTargetStateError,
} from '../domain/errors/user-management.errors';

/** Traduce errores de dominio del módulo a excepciones HTTP de Nest. */
export function mapUserError(error: unknown): never {
  if (error instanceof RoleNotAuthorizedError) {
    throw new ForbiddenException(error.message);
  }
  if (
    error instanceof InvitationNotFoundError ||
    error instanceof MemberNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof InvitationNotAcceptableError ||
    error instanceof InvitationNotPendingError ||
    error instanceof DuplicateActiveMembershipError ||
    error instanceof DuplicatePendingInvitationError ||
    error instanceof CannotModifySelfError ||
    error instanceof MemberAlreadyInTargetStateError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
