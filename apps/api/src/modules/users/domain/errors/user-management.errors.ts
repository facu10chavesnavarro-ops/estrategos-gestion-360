export class InvitationNotFoundError extends Error {
  constructor() {
    super('La invitación no existe.');
    this.name = 'InvitationNotFoundError';
  }
}

/** RN-USR-04: token vencido, ya aceptado o revocado — no se distingue el motivo en el mensaje. */
export class InvitationNotAcceptableError extends Error {
  constructor() {
    super('La invitación no es válida (vencida, ya aceptada o revocada).');
    this.name = 'InvitationNotAcceptableError';
  }
}

export class InvitationNotPendingError extends Error {
  constructor() {
    super('Solo se pueden revocar invitaciones pendientes.');
    this.name = 'InvitationNotPendingError';
  }
}

/** RN-USR-05: el email ya tiene membresía activa en la empresa. */
export class DuplicateActiveMembershipError extends Error {
  constructor() {
    super('Ese email ya tiene acceso activo a esta empresa.');
    this.name = 'DuplicateActiveMembershipError';
  }
}

/** RN-USR-06: ya existe una invitación pendiente para ese email/empresa. */
export class DuplicatePendingInvitationError extends Error {
  constructor() {
    super('Ya existe una invitación pendiente para ese email en esta empresa.');
    this.name = 'DuplicatePendingInvitationError';
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super('El usuario indicado no es miembro de esta empresa.');
    this.name = 'MemberNotFoundError';
  }
}

/** RN-USR-12: no auto-modificación de rol ni auto-desactivación. */
export class CannotModifySelfError extends Error {
  constructor() {
    super('No podés modificar tu propio acceso o rol en la empresa.');
    this.name = 'CannotModifySelfError';
  }
}

/** RN-USR-09: activar/desactivar algo que ya está en ese estado. */
export class MemberAlreadyInTargetStateError extends Error {
  constructor(state: 'activo' | 'inactivo') {
    super(`El acceso del usuario ya está ${state}.`);
    this.name = 'MemberAlreadyInTargetStateError';
  }
}
