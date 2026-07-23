export class InvalidTaxIdError extends Error {
  constructor() {
    super('El CUIT no tiene un formato válido (NN-NNNNNNNN-N).');
    this.name = 'InvalidTaxIdError';
  }
}

export class DuplicateCustomerError extends Error {
  constructor() {
    super('Ya existe un cliente con ese CUIT en esta empresa.');
    this.name = 'DuplicateCustomerError';
  }
}

export class InvalidCreditLimitError extends Error {
  constructor() {
    super('El límite de crédito no puede ser negativo.');
    this.name = 'InvalidCreditLimitError';
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super('El cliente indicado no existe.');
    this.name = 'CustomerNotFoundError';
  }
}

/** RN-TER-05: activar/desactivar algo que ya está en ese estado. */
export class CustomerAlreadyInTargetStateError extends Error {
  constructor(state: 'activo' | 'inactivo') {
    super(`El cliente ya está ${state}.`);
    this.name = 'CustomerAlreadyInTargetStateError';
  }
}
