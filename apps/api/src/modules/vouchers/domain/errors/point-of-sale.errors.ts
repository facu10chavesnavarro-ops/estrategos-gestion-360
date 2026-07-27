export class PointOfSaleNotFoundError extends Error {
  constructor() {
    super('El punto de venta indicado no existe.');
    this.name = 'PointOfSaleNotFoundError';
  }
}

/** RN-VOU-01: branchId debe pertenecer a la misma empresa. */
export class InvalidPointOfSaleBranchError extends Error {
  constructor() {
    super('La sucursal indicada no existe en esta empresa.');
    this.name = 'InvalidPointOfSaleBranchError';
  }
}

export class DuplicatePointOfSaleCodeError extends Error {
  constructor() {
    super('Ya existe un punto de venta con ese código en esta empresa.');
    this.name = 'DuplicatePointOfSaleCodeError';
  }
}

export class PointOfSaleAlreadyInTargetStateError extends Error {
  constructor(state: 'activo' | 'inactivo') {
    super(`El punto de venta ya está ${state}.`);
    this.name = 'PointOfSaleAlreadyInTargetStateError';
  }
}
