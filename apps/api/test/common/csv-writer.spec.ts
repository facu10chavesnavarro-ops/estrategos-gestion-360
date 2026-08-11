import { toCsv } from '../../src/common/application/csv-writer';

describe('toCsv', () => {
  const columns = [{ key: 'name' as const, header: 'Nombre' }];

  it('arma encabezado y filas separadas por CRLF', () => {
    const result = toCsv([{ name: 'Uno' }, { name: 'Dos' }], columns);

    expect(result).toBe('Nombre\r\nUno\r\nDos\r\n');
  });

  it('envuelve entre comillas un valor con coma, comilla o salto de línea', () => {
    const result = toCsv([{ name: 'Uno, "Dos"\nTres' }], columns);

    expect(result).toBe('Nombre\r\n"Uno, ""Dos""\nTres"\r\n');
  });

  it('null/undefined se serializan como celda vacía', () => {
    const result = toCsv([{ name: null }, { name: undefined }], columns);

    expect(result).toBe('Nombre\r\n\r\n\r\n');
  });

  // Auditoría de seguridad: inyección de fórmulas CSV — un valor que
  // empieza con =/+/-/@ se interpreta como fórmula al abrir el archivo en
  // Excel/Sheets (ej. un nombre de ítem `=cmd|' /C calc'!A0`). Se antepone
  // un `'` para forzarlo a texto literal.
  describe('neutraliza inyección de fórmulas CSV', () => {
    it.each(['=cmd|\' /C calc\'!A0', '+1+1', '-1+1', '@SUM(A1)', '\tsneaky'])(
      'antepone un apóstrofe a un valor que empieza con %p',
      (value) => {
        const result = toCsv([{ name: value }], columns);
        expect(result).toBe(`Nombre\r\n'${value}\r\n`);
      },
    );

    it('un valor con fórmula que además tiene coma queda comillado con el apóstrofe adentro', () => {
      const result = toCsv([{ name: '=A1,B1' }], columns);
      expect(result).toBe('Nombre\r\n"\'=A1,B1"\r\n');
    });

    it('no toca un valor que no empieza con un carácter de fórmula', () => {
      const result = toCsv([{ name: 'Producto normal' }], columns);
      expect(result).toBe('Nombre\r\nProducto normal\r\n');
    });
  });
});
