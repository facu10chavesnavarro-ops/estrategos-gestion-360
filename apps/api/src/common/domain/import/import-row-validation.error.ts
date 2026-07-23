/** Lanzado por ImportRowProcessor.parseRow() cuando una fila no es válida. */
export class ImportRowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportRowValidationError';
  }
}
