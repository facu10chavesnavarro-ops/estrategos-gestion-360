export class PriceListNotFoundError extends Error {
  constructor() {
    super('La lista de precios indicada no existe.');
    this.name = 'PriceListNotFoundError';
  }
}

/** RN-CAT-16. */
export class PriceListAlreadyInTargetStateError extends Error {
  constructor(state: 'activa' | 'inactiva') {
    super(`La lista de precios ya está ${state}.`);
    this.name = 'PriceListAlreadyInTargetStateError';
  }
}

/** RN-CAT-12. */
export class InvalidPriceError extends Error {
  constructor() {
    super('El precio no puede ser negativo.');
    this.name = 'InvalidPriceError';
  }
}

export class ItemNotInPriceListError extends Error {
  constructor() {
    super('Ese ítem no tiene un precio definido en esta lista.');
    this.name = 'ItemNotInPriceListError';
  }
}
