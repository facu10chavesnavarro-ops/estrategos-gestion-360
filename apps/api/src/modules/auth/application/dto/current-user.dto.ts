export interface GetCurrentUserInput {
  userId: string;
  /** Opcional: si se envía, se resuelve también la membresía en esa
   * empresa (rol, estado). Sin ella, solo se devuelve la identidad. */
  companyId?: string;
}

export interface CurrentUserOutput {
  id: string;
  email: string;
  fullName: string;
  membership: {
    companyId: string;
    roleId: string;
    roleName: string;
    isActive: boolean;
  } | null;
}
