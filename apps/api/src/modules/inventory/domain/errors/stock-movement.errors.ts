/** RN-STK-13: solo Items con tracksStock=true admiten movimientos. */
export class ItemDoesNotTrackStockError extends Error {
  constructor() {
    super('Este ítem no controla stock — no admite movimientos.');
    this.name = 'ItemDoesNotTrackStockError';
  }
}

/** RN-STK-06. */
export class InsufficientStockError extends Error {
  constructor() {
    super('No hay stock suficiente para esta salida en este depósito.');
    this.name = 'InsufficientStockError';
  }
}

/** RN-STK-07: toda salida exige motivo. */
export class MissingReasonError extends Error {
  constructor() {
    super('El motivo es obligatorio para una salida de stock.');
    this.name = 'MissingReasonError';
  }
}

/** Una entrada de ajuste exige el costo unitario para recalcular el promedio. */
export class MissingUnitCostError extends Error {
  constructor() {
    super('El costo unitario es obligatorio para una entrada de stock.');
    this.name = 'MissingUnitCostError';
  }
}

/** RN-STK-09: los dos depósitos de una transferencia deben ser distintos. */
export class SameWarehouseTransferError extends Error {
  constructor() {
    super('El depósito de origen y destino de una transferencia deben ser distintos.');
    this.name = 'SameWarehouseTransferError';
  }
}

export class InvalidQuantityError extends Error {
  constructor() {
    super('La cantidad debe ser mayor a cero.');
    this.name = 'InvalidQuantityError';
  }
}
