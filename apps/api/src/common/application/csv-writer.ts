/**
 * Serializador CSV mínimo, sin dependencias nuevas — mismo criterio que
 * el generador de uuidv7 (Sprint 3.1): una utilidad chica y controlada en
 * vez de sumar un paquete para una sola necesidad. Primer caso de
 * exportación CSV del backend (hasta ahora solo existía el sentido
 * inverso, `CsvParserPort`/`csv-parse`, para Clientes/Proveedores en F2).
 *
 * Escapa un valor solo si contiene coma, comilla doble o salto de línea
 * (regla estándar RFC 4180): se envuelve en comillas dobles y las
 * comillas internas se duplican.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convierte un array de objetos a texto CSV con encabezado, usando
 * `columns` como el orden y el subconjunto de campos a incluir (evita
 * serializar accidentalmente algo no pensado para exportarse).
 */
export function toCsv<T extends object>(
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>,
): string {
  const headerLine = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key])).join(','),
  );
  return [headerLine, ...lines].join('\r\n') + '\r\n';
}
