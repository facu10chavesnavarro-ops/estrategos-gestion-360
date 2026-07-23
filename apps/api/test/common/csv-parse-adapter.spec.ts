import { CsvParseAdapter } from '../../src/common/infrastructure/csv-parse-adapter';
import { BadRequestException } from '@nestjs/common';

describe('CsvParseAdapter (librería csv-parse real, sin mocks)', () => {
  const adapter = new CsvParseAdapter();

  it('parsea un CSV simple con encabezado', () => {
    const result = adapter.parse('legalName,taxId\nCliente Uno,30-12345678-9');

    expect(result).toEqual([{ legalName: 'Cliente Uno', taxId: '30-12345678-9' }]);
  });

  it('parsea campos entre comillas que contienen comas', () => {
    const result = adapter.parse(
      'legalName,notes\n"Cliente, S.A.","Nota con, coma adentro"',
    );

    expect(result).toEqual([
      { legalName: 'Cliente, S.A.', notes: 'Nota con, coma adentro' },
    ]);
  });

  it('recorta espacios en blanco alrededor de los valores (trim)', () => {
    const result = adapter.parse('legalName, taxId \n Cliente Uno , 30-12345678-9 ');

    expect(result).toEqual([{ legalName: 'Cliente Uno', taxId: '30-12345678-9' }]);
  });

  it('ignora líneas vacías', () => {
    const result = adapter.parse('legalName,taxId\nCliente Uno,30-12345678-9\n\n');

    expect(result).toHaveLength(1);
  });

  it('devuelve un array vacío si solo hay encabezado', () => {
    const result = adapter.parse('legalName,taxId\n');

    expect(result).toEqual([]);
  });

  it('lanza BadRequestException con un CSV mal formado (comillas sin cerrar)', () => {
    expect(() => adapter.parse('legalName,notes\n"Cliente Uno,"nota sin cerrar')).toThrow(
      BadRequestException,
    );
  });

  it('múltiples filas con distinta cantidad de columnas provistas quedan con la columna faltante undefined', () => {
    const result = adapter.parse('legalName,taxId,email\nUno,111,uno@x.com\nDos,,');

    expect(result[0]).toEqual({ legalName: 'Uno', taxId: '111', email: 'uno@x.com' });
    expect(result[1]).toEqual({ legalName: 'Dos', taxId: '', email: '' });
  });
});
