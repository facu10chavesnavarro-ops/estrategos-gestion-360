import { InvitationStatus } from '../../domain/entities/invitation.entity';

export interface CreateInvitationUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  email: string;
  roleId: string;
}

export interface CreateInvitationUseCaseOutput {
  id: string;
  email: string;
  roleId: string;
  expiresAt: Date;
  /** Se devuelve UNA sola vez, en la respuesta de creación (ver §0.2/§0.3). */
  token: string;
}

export interface InvitationListItem {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface RevokeInvitationUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  invitationId: string;
}

export interface InvitationPreview {
  companyName: string;
  roleName: string;
  email: string;
  status: InvitationStatus;
}

export interface AcceptInvitationUseCaseInput {
  token: string;
  password: string;
  fullName?: string;
}

export interface AcceptInvitationUseCaseOutput {
  userId: string;
  companyId: string;
}
