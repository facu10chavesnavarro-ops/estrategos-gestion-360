export class WarehouseNotFoundError extends Error {
  constructor() {
    super('El depósito indicado no existe.');
    this.name = 'WarehouseNotFoundError';
  }
}

/** RN-STK-01: branchId debe pertenecer a la misma empresa. */
export class InvalidWarehouseBranchError extends Error {
  constructor() {
    super('La sucursal indicada no existe en esta empresa.');
    this.name = 'InvalidWarehouseBranchError';
  }
}

/** RN-STK-02. */
export class DuplicateWarehouseNameError extends Error {
  constructor() {
    super('Ya existe un depósito con ese nombre en esta sucursal.');
    this.name = 'DuplicateWarehouseNameError';
  }
}

/** RN-STK-12. */
export class WarehouseAlreadyInTargetStateError extends Error {
  constructor(state: 'activo' | 'inactivo') {
    super(`El depósito ya está ${state}.`);
    this.name = 'WarehouseAlreadyInTargetStateError';
  }
}
