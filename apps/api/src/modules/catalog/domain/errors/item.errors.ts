export class ItemNotFoundError extends Error {
  constructor() {
    super('El ítem indicado no existe.');
    this.name = 'ItemNotFoundError';
  }
}

/** RN-CAT-05. */
export class DuplicateSkuError extends Error {
  constructor() {
    super('Ya existe un ítem con ese SKU en esta empresa.');
    this.name = 'DuplicateSkuError';
  }
}

/** RN-CAT-08: minimumStock solo tiene sentido si tracksStock = true. */
export class MinimumStockWithoutTrackingError extends Error {
  constructor() {
    super('No se puede definir un stock mínimo para un ítem que no controla stock.');
    this.name = 'MinimumStockWithoutTrackingError';
  }
}

/** RN-CAT-02 aplicado a Item.categoryId. */
export class InvalidItemCategoryError extends Error {
  constructor() {
    super('La categoría indicada no existe en esta empresa.');
    this.name = 'InvalidItemCategoryError';
  }
}

/** RN-CAT-16. */
export class ItemAlreadyInTargetStateError extends Error {
  constructor(state: 'activo' | 'inactivo') {
    super(`El ítem ya está ${state}.`);
    this.name = 'ItemAlreadyInTargetStateError';
  }
}

/** RN-CAT-11 aplicado: un taxId informado debe existir y pertenecer a la empresa. */
export class InvalidItemTaxError extends Error {
  constructor() {
    super('Uno de los impuestos indicados no existe en esta empresa.');
    this.name = 'InvalidItemTaxError';
  }
}

export class InvalidCostPriceError extends Error {
  constructor() {
    super('El costo no puede ser negativo.');
    this.name = 'InvalidCostPriceError';
  }
}

/** Mismo criterio que RN-CAT-05 (SKU), aplicado al código de barras. */
export class DuplicateBarcodeError extends Error {
  constructor() {
    super('Ya existe un ítem con ese código de barras en esta empresa.');
    this.name = 'DuplicateBarcodeError';
  }
}
