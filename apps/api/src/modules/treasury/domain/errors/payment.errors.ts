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
