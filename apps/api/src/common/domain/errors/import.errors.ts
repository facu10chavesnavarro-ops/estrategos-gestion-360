/**
 * Error de dominio compartido: el CSV enviado excede el límite de filas que
 * el motor procesa en una sola importación. Auditoría de seguridad (hallazgo
 * Medio #1) — sin este límite, un archivo arbitrariamente grande dispara una
 * fila-por-transacción secuencial sin cota, degradando el servicio.
 * Ver CsvImportEngine.MAX_ROWS.
 */
export class ImportTooManyRowsError extends Error {
  constructor(rowCount: number, maxRows: number) {
    super(
      `El archivo tiene ${rowCount} filas de datos, más que el máximo permitido por importación (${maxRows}). Dividilo en archivos más chicos.`,
    );
    this.name = 'ImportTooManyRowsError';
  }
}
