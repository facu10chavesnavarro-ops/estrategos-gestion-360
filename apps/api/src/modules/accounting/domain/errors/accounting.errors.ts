export class ChartOfAccountNotFoundError extends Error {
  constructor() {
    super('La cuenta contable indicada no existe.');
    this.name = 'ChartOfAccountNotFoundError';
  }
}

/** RN-ACC (jerarquía): el padre debe existir en la misma empresa. */
export class InvalidParentAccountError extends Error {
  constructor() {
    super('La cuenta padre indicada no existe en esta empresa.');
    this.name = 'InvalidParentAccountError';
  }
}

export class AccountCycleError extends Error {
  constructor() {
    super('La cuenta no puede ser padre de sí misma, directa o indirectamente.');
    this.name = 'AccountCycleError';
  }
}

export class DuplicateAccountCodeError extends Error {
  constructor() {
    super('Ya existe una cuenta con ese código en esta empresa.');
    this.name = 'DuplicateAccountCodeError';
  }
}

export class ChartOfAccountAlreadyInTargetStateError extends Error {
  constructor(state: 'activa' | 'inactiva') {
    super(`La cuenta ya está ${state}.`);
    this.name = 'ChartOfAccountAlreadyInTargetStateError';
  }
}

/** RN-ACC-01: solo las cuentas hoja (allowsMovements = true) reciben líneas de asiento. */
export class AccountNotImputableError extends Error {
  constructor() {
    super('La cuenta indicada es agrupadora y no admite movimientos directos.');
    this.name = 'AccountNotImputableError';
  }
}

/** RN-ACC-02. */
export class SystemAccountCannotBeDeactivatedError extends Error {
  constructor() {
    super('Esta cuenta es utilizada por el sistema y no puede desactivarse.');
    this.name = 'SystemAccountCannotBeDeactivatedError';
  }
}

/** La cuenta indicada para un mapeo no pertenece a esta empresa o no es imputable. */
export class InvalidAccountMappingError extends Error {
  constructor() {
    super('La cuenta indicada no es válida para este mapeo: debe pertenecer a la empresa y ser imputable.');
    this.name = 'InvalidAccountMappingError';
  }
}

export class AccountingSettingsNotFoundError extends Error {
  constructor() {
    super('Esta empresa todavía no activó Contabilidad.');
    this.name = 'AccountingSettingsNotFoundError';
  }
}

export class AccountingAlreadyActivatedError extends Error {
  constructor() {
    super('Esta empresa ya tiene Contabilidad activada.');
    this.name = 'AccountingAlreadyActivatedError';
  }
}

/** RN-ACC-03. */
export class UnbalancedJournalEntryError extends Error {
  constructor() {
    super('El asiento no está balanceado: la suma del Debe debe ser igual a la suma del Haber.');
    this.name = 'UnbalancedJournalEntryError';
  }
}

export class EmptyJournalEntryLinesError extends Error {
  constructor() {
    super('El asiento debe tener al menos dos líneas.');
    this.name = 'EmptyJournalEntryLinesError';
  }
}

export class JournalEntryNotFoundError extends Error {
  constructor() {
    super('El asiento indicado no existe.');
    this.name = 'JournalEntryNotFoundError';
  }
}

export class JournalEntryAlreadyReversedError extends Error {
  constructor() {
    super('Este asiento ya fue revertido.');
    this.name = 'JournalEntryAlreadyReversedError';
  }
}

export class InvalidJournalEntryAccountError extends Error {
  constructor() {
    super('Una de las cuentas del asiento no existe en esta empresa o no es imputable.');
    this.name = 'InvalidJournalEntryAccountError';
  }
}

/** RN-ACC-05: confirmar un Voucher sin las cuentas de Category/Tax mapeadas lo rechaza. */
export class MissingCategoryAccountMappingError extends Error {
  constructor() {
    super(
      'La categoría de uno de los ítems del comprobante no tiene una cuenta contable mapeada.',
    );
    this.name = 'MissingCategoryAccountMappingError';
  }
}

export class MissingTaxAccountMappingError extends Error {
  constructor() {
    super('Uno de los impuestos del comprobante no tiene una cuenta contable mapeada.');
    this.name = 'MissingTaxAccountMappingError';
  }
}

/** RN-ACC-05: confirmar un Payment con cobro/pago en efectivo sin la caja mapeada lo rechaza. */
export class MissingCashRegisterAccountMappingError extends Error {
  constructor() {
    super('La caja utilizada en este cobro/pago no tiene una cuenta contable mapeada.');
    this.name = 'MissingCashRegisterAccountMappingError';
  }
}

export class MissingBankAccountMappingError extends Error {
  constructor() {
    super('La cuenta bancaria utilizada en este cobro/pago no tiene una cuenta contable mapeada.');
    this.name = 'MissingBankAccountMappingError';
  }
}

export class MissingPaymentMethodAccountMappingError extends Error {
  constructor() {
    super('El medio de pago utilizado no tiene una cuenta contable mapeada para este sentido.');
    this.name = 'MissingPaymentMethodAccountMappingError';
  }
}

/** RN-ACC-06: movimiento manual de caja/banco con Contabilidad activa. */
export class MissingCounterpartAccountError extends Error {
  constructor() {
    super('Debe indicar la cuenta contable contrapartida de este movimiento manual.');
    this.name = 'MissingCounterpartAccountError';
  }
}
