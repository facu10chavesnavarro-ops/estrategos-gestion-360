export class TaxNotFoundError extends Error {
  constructor() {
    super('El impuesto indicado no existe.');
    this.name = 'TaxNotFoundError';
  }
}

/** RN-CAT-09. */
export class InvalidTaxRateError extends Error {
  constructor() {
    super('La tasa del impuesto no puede ser negativa.');
    this.name = 'InvalidTaxRateError';
  }
}

/** RN-CAT-10. */
export class InvalidTaxValidityError extends Error {
  constructor() {
    super('La fecha de fin de vigencia debe ser posterior a la de inicio.');
    this.name = 'InvalidTaxValidityError';
  }
}

/** Cerrar (§3, endpoint /close) un impuesto que ya está cerrado. */
export class TaxAlreadyClosedError extends Error {
  constructor() {
    super('El impuesto ya no está vigente.');
    this.name = 'TaxAlreadyClosedError';
  }
}
