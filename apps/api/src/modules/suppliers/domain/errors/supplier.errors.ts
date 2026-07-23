export class InvalidTaxIdError extends Error {
  constructor() {
    super('El CUIT no tiene un formato válido (NN-NNNNNNNN-N).');
    this.name = 'InvalidTaxIdError';
  }
}

export class DuplicateSupplierError extends Error {
  constructor() {
    super('Ya existe un proveedor con ese CUIT en esta empresa.');
    this.name = 'DuplicateSupplierError';
  }
}

export class SupplierNotFoundError extends Error {
  constructor() {
    super('El proveedor indicado no existe.');
    this.name = 'SupplierNotFoundError';
  }
}

/** RN-TER-05: activar/desactivar algo que ya está en ese estado. */
export class SupplierAlreadyInTargetStateError extends Error {
  constructor(state: 'activo' | 'inactivo') {
    super(`El proveedor ya está ${state}.`);
    this.name = 'SupplierAlreadyInTargetStateError';
  }
}
