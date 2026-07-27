export class VoucherNotFoundError extends Error {
  constructor() {
    super('El comprobante indicado no existe.');
    this.name = 'VoucherNotFoundError';
  }
}

export class VoucherTypeNotFoundError extends Error {
  constructor() {
    super('El tipo de comprobante indicado no existe o está inactivo.');
    this.name = 'VoucherTypeNotFoundError';
  }
}

/** RN-VOU-01: el punto de venta debe pertenecer a la sucursal y empresa indicadas. */
export class InvalidVoucherPointOfSaleError extends Error {
  constructor() {
    super('El punto de venta indicado no existe en esta sucursal.');
    this.name = 'InvalidVoucherPointOfSaleError';
  }
}

/** RN-VOU-04. */
export class InvalidCounterpartyError extends Error {
  constructor() {
    super('La contraparte indicada no existe o no está activa para este tipo de comprobante.');
    this.name = 'InvalidCounterpartyError';
  }
}

/** RN-VOU-08: el tipo de comprobante exige relatedVoucherId. */
export class MissingRelatedVoucherError extends Error {
  constructor() {
    super('Este tipo de comprobante requiere indicar el comprobante relacionado.');
    this.name = 'MissingRelatedVoucherError';
  }
}

/** RN-VOU-08: el comprobante relacionado no existe o no corresponde a la misma contraparte. */
export class InvalidRelatedVoucherError extends Error {
  constructor() {
    super('El comprobante relacionado no existe o no pertenece a la misma contraparte.');
    this.name = 'InvalidRelatedVoucherError';
  }
}

/** RN-VOU-07. */
export class MissingWarehouseError extends Error {
  constructor() {
    super('Debe indicar un depósito porque el comprobante afecta stock.');
    this.name = 'MissingWarehouseError';
  }
}

export class EmptyVoucherLinesError extends Error {
  constructor() {
    super('El comprobante debe tener al menos una línea.');
    this.name = 'EmptyVoucherLinesError';
  }
}

/** Referencia a un ítem que no existe en esta empresa. */
export class InvalidVoucherLineItemError extends Error {
  constructor() {
    super('Uno de los ítems indicados en las líneas no existe en esta empresa.');
    this.name = 'InvalidVoucherLineItemError';
  }
}

export class InvalidVoucherLineQuantityError extends Error {
  constructor() {
    super('La cantidad de cada línea debe ser mayor a cero.');
    this.name = 'InvalidVoucherLineQuantityError';
  }
}
