export class CompanyRoleNotAuthorizedError extends Error {
  constructor() {
    super('El rol del usuario no autoriza esta operación.');
    this.name = 'CompanyRoleNotAuthorizedError';
  }
}

export class InvalidTaxIdError extends Error {
  constructor() {
    super('El CUIT no tiene un formato válido (NN-NNNNNNNN-N).');
    this.name = 'InvalidTaxIdError';
  }
}

export class CompanyNotFoundError extends Error {
  constructor() {
    super('La empresa indicada no existe.');
    this.name = 'CompanyNotFoundError';
  }
}

export class BranchNotFoundError extends Error {
  constructor() {
    super('La sucursal indicada no existe en esta empresa.');
    this.name = 'BranchNotFoundError';
  }
}

/** RN-EMP-06: activar/desactivar algo que ya está en ese estado es un error, no un no-op. */
export class AlreadyInTargetStateError extends Error {
  constructor(entity: 'La empresa' | 'La sucursal', state: 'activa' | 'inactiva') {
    super(`${entity} ya se encuentra ${state}.`);
    this.name = 'AlreadyInTargetStateError';
  }
}
