export class CategoryNotFoundError extends Error {
  constructor() {
    super('La categoría indicada no existe.');
    this.name = 'CategoryNotFoundError';
  }
}

/** RN-CAT-02: parentId debe pertenecer a la misma empresa. */
export class InvalidParentCategoryError extends Error {
  constructor() {
    super('La categoría padre indicada no existe en esta empresa.');
    this.name = 'InvalidParentCategoryError';
  }
}

/** RN-CAT-03: no se permiten ciclos en la jerarquía. */
export class CategoryCycleError extends Error {
  constructor() {
    super('No se puede asignar esa categoría padre: crearía un ciclo en la jerarquía.');
    this.name = 'CategoryCycleError';
  }
}

/** RN-CAT-16. */
export class CategoryAlreadyInTargetStateError extends Error {
  constructor(state: 'activa' | 'inactiva') {
    super(`La categoría ya está ${state}.`);
    this.name = 'CategoryAlreadyInTargetStateError';
  }
}
