export class CashRegisterNotFoundError extends Error {
  constructor() {
    super('La caja indicada no existe.');
    this.name = 'CashRegisterNotFoundError';
  }
}

/** RN-CASH-01. */
export class InvalidCashRegisterBranchError extends Error {
  constructor() {
    super('La sucursal indicada no existe en esta empresa.');
    this.name = 'InvalidCashRegisterBranchError';
  }
}

export class CashRegisterAlreadyInTargetStateError extends Error {
  constructor(state: 'activa' | 'inactiva') {
    super(`La caja ya está ${state}.`);
    this.name = 'CashRegisterAlreadyInTargetStateError';
  }
}

export class CashSessionNotFoundError extends Error {
  constructor() {
    super('La sesión de caja indicada no existe.');
    this.name = 'CashSessionNotFoundError';
  }
}

/** RN-CASH-02. */
export class CashRegisterAlreadyHasOpenSessionError extends Error {
  constructor() {
    super('Esta caja ya tiene una sesión abierta.');
    this.name = 'CashRegisterAlreadyHasOpenSessionError';
  }
}

/** RN-CASH-03. */
export class InvalidOpeningBalanceError extends Error {
  constructor() {
    super('El saldo de apertura no puede ser negativo.');
    this.name = 'InvalidOpeningBalanceError';
  }
}

/** RN-CASH-04. */
export class CashSessionAlreadyClosedError extends Error {
  constructor() {
    super('Esta sesión de caja ya está cerrada.');
    this.name = 'CashSessionAlreadyClosedError';
  }
}

/** RN-CASH-05: reason obligatorio si paymentId es nulo. */
export class MissingCashMovementReasonError extends Error {
  constructor() {
    super('Debe indicar un motivo para un movimiento de caja manual.');
    this.name = 'MissingCashMovementReasonError';
  }
}

/** RN-CASH-06. */
export class CashSessionNotOpenError extends Error {
  constructor() {
    super('La sesión de caja indicada no está abierta.');
    this.name = 'CashSessionNotOpenError';
  }
}

export class InvalidCashMovementAmountError extends Error {
  constructor() {
    super('El monto del movimiento de caja debe ser mayor a cero.');
    this.name = 'InvalidCashMovementAmountError';
  }
}
