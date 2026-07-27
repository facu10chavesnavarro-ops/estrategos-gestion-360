export class BankAccountNotFoundError extends Error {
  constructor() {
    super('La cuenta bancaria indicada no existe.');
    this.name = 'BankAccountNotFoundError';
  }
}

export class BankAccountAlreadyInTargetStateError extends Error {
  constructor(state: 'activa' | 'inactiva') {
    super(`La cuenta bancaria ya está ${state}.`);
    this.name = 'BankAccountAlreadyInTargetStateError';
  }
}

/** RN-BANK-03: description obligatorio si paymentId es nulo. */
export class MissingBankMovementDescriptionError extends Error {
  constructor() {
    super('Debe indicar una descripción para un movimiento bancario manual.');
    this.name = 'MissingBankMovementDescriptionError';
  }
}

export class InvalidBankMovementAmountError extends Error {
  constructor() {
    super('El monto del movimiento bancario debe ser mayor a cero.');
    this.name = 'InvalidBankMovementAmountError';
  }
}
