export class PaymentNotFoundError extends Error {
  constructor() {
    super('El pago/cobro indicado no existe.');
    this.name = 'PaymentNotFoundError';
  }
}

/** RN-PAY-01. */
export class InvalidPaymentCounterpartyError extends Error {
  constructor() {
    super('La contraparte indicada no existe o no está activa para este movimiento.');
    this.name = 'InvalidPaymentCounterpartyError';
  }
}

export class EmptyPaymentMethodDetailsError extends Error {
  constructor() {
    super('El pago debe informar al menos un medio de pago.');
    this.name = 'EmptyPaymentMethodDetailsError';
  }
}

export class InvalidPaymentMethodError extends Error {
  constructor() {
    super('Uno de los medios de pago indicados no existe o está inactivo.');
    this.name = 'InvalidPaymentMethodError';
  }
}

/** RN-PAY-07: CHEQUE exige CheckDetail. */
export class MissingCheckDetailError extends Error {
  constructor() {
    super('Debe informar los datos del cheque para este medio de pago.');
    this.name = 'MissingCheckDetailError';
  }
}

/** RN-PAY-03: suma de imputaciones de este pago > su totalAmount. */
export class AllocationExceedsPaymentAmountError extends Error {
  constructor() {
    super('La suma de las imputaciones no puede superar el monto total del pago.');
    this.name = 'AllocationExceedsPaymentAmountError';
  }
}

/** RN-PAY-04: el comprobante no existe, es de otra empresa o de otra contraparte. */
export class InvalidAllocationVoucherError extends Error {
  constructor() {
    super('Uno de los comprobantes indicados no existe o no corresponde a esta contraparte.');
    this.name = 'InvalidAllocationVoucherError';
  }
}

/** RN-PAY-05: la imputación dejaría el comprobante sobre-pagado. */
export class VoucherOverpaidError extends Error {
  constructor() {
    super('La imputación supera el saldo pendiente del comprobante.');
    this.name = 'VoucherOverpaidError';
  }
}

/** RN-PAY-10: algún medio requiere caja pero no se indicó cashSessionId. */
export class MissingCashSessionError extends Error {
  constructor() {
    super('Debe indicar la sesión de caja para un medio de pago en efectivo.');
    this.name = 'MissingCashSessionError';
  }
}

/** RN-PAY-10: la sesión indicada no existe, no está abierta o es de otra empresa. */
export class InvalidCashSessionError extends Error {
  constructor() {
    super('La sesión de caja indicada no existe, no está abierta o no corresponde a esta empresa.');
    this.name = 'InvalidCashSessionError';
  }
}

/** RN-PAY-10: algún medio requiere banco pero no se indicó bankAccountId. */
export class MissingBankAccountError extends Error {
  constructor() {
    super('Debe indicar la cuenta bancaria para este medio de pago.');
    this.name = 'MissingBankAccountError';
  }
}

/** RN-PAY-10: la cuenta indicada no existe, no está activa o es de otra empresa. */
export class InvalidBankAccountError extends Error {
  constructor() {
    super('La cuenta bancaria indicada no existe, no está activa o no corresponde a esta empresa.');
    this.name = 'InvalidBankAccountError';
  }
}
