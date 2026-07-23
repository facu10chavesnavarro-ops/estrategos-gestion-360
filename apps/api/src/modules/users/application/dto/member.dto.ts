export interface ChangeMemberRoleUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  targetUserId: string;
  roleId: string;
}

export interface ChangeMemberStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  targetUserId: string;
}
