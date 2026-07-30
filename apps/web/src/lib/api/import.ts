/**
 * Tipos del motor de importación CSV genérico del backend
 * (`common/domain/import/import.types.ts`) — compartidos por cualquier
 * módulo que importe (Clientes, Proveedores, y a futuro Productos,
 * Servicios, etc., ver docs/sprint-2/01-clientes-proveedores.md §0.6).
 */
export type ImportMode = 'skip-new-only' | 'update-existing' | 'skip-silently';

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  skippedDuplicates: number;
  rejected: Array<{ row: number; reason: string }>;
}

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  'skip-new-only': 'Rechazar duplicados (no crear ni actualizar)',
  'update-existing': 'Actualizar existentes',
  'skip-silently': 'Omitir duplicados sin error',
};
