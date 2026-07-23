/**
 * Puerto que cada entidad importable implementa una sola vez (Clientes,
 * Proveedores y, a futuro, Productos/Servicios/Plan de cuentas/Bancos/Stock).
 * CsvImportEngine no conoce nada de esto — solo llama a estos métodos en
 * orden. Ver docs/sprint-2/01-clientes-proveedores.md §0.6.
 */
export interface ImportRowProcessor<TRow, TEntity> {
  readonly entityType: string;

  /** Valida y mapea una fila cruda del CSV. Lanza ImportRowValidationError si no es válida. */
  parseRow(rawRow: Record<string, string>, rowNumber: number): TRow;

  /** ¿Ya existe un registro equivalente para esta empresa? (define qué es "duplicado"). */
  findExisting(row: TRow, companyId: string): Promise<TEntity | null>;

  /** Crea el registro nuevo (puede reutilizar datos compartidos existentes, ver RN-TER-13). */
  create(row: TRow, companyId: string): Promise<TEntity>;

  /** Actualiza un registro existente; informa qué campos cambiaron para la auditoría. */
  applyUpdate(
    existing: TEntity,
    row: TRow,
  ): Promise<{ entity: TEntity; changedFields: string[] }>;

  getEntityId(entity: TEntity): string;
}
