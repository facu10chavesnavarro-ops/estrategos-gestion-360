/** Parsea texto CSV a filas crudas. La primera línea se toma como encabezado. */
export abstract class CsvParserPort {
  abstract parse(csvContent: string): Record<string, string>[];
}
